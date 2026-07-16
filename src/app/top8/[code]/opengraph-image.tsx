import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getTop8Cards, type Top8Card } from "../top8Cards";

// The social-preview image for a Top 8 share link (Next's opengraph-image file
// convention wires it into the page's og:image/twitter:image tags). Rendered
// per code and immutable for a given code, exactly like the page.
//
// Art comes from the original pkmncards JPEGs (cards.image_url), NOT our WebP
// storage copies — satori, the renderer behind ImageResponse, can't decode
// WebP. Scrapers fetch this image once per share per platform, so the upstream
// load is negligible.

export const alt = "My top 8 Pokémon cards, ranked on CardMash";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// pkmncards.com bot-challenges default HTTP-library user agents (the same
// reason backfill-card-art.ts sends one); a browser UA gets the plain JPEG.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Card cells sized to fill the space beside the title rail: 4 × 189 + gaps
// across, two rows down, at the catalog art's ~0.72 aspect ratio.
const CARD_W = 189;
const CARD_H = 262;

// Inline each art as a data URI: satori would fetch remote URLs itself, but
// without the UA header above pkmncards would challenge it. null (a fetch
// failure) renders as a neutral placeholder slot rather than failing the image.
async function jpegDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { "user-agent": BROWSER_UA } });
    if (!res.ok) return null;
    return `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Top8OgImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cards = await getTop8Cards(code);
  if (!cards) return new Response("Not found", { status: 404 });

  // Subset TTFs colocated in src/app/top8 — satori takes raw font data, and the
  // tiny subsets (the wordmark + title glyphs only) keep the route light. Read
  // via process.cwd() (the Next docs pattern for Node-runtime og images) so the
  // build's file tracing bundles the fonts into the deployed function.
  const fontDir = join(process.cwd(), "src/app/top8");
  const [spaceMono, fredoka, arts] = await Promise.all([
    readFile(join(fontDir, "space-mono-700-subset.ttf")),
    readFile(join(fontDir, "fredoka-600-cardmash.ttf")),
    Promise.all(cards.map((card) => jpegDataUri(card.image_url))),
  ]);

  // One card cell: art (or placeholder) with a rank badge hung off the corner —
  // the share page's badge language, in satori-safe inline styles.
  function cell(card: Top8Card, rank: number) {
    const art = arts[rank - 1];
    return (
      <div key={rank} style={{ display: "flex", position: "relative" }}>
        {art ? (
          <img
            src={art}
            alt=""
            width={CARD_W}
            height={CARD_H}
            style={{ borderRadius: 12, objectFit: "cover", boxShadow: "0 4px 10px rgba(0,0,0,0.18)" }}
          />
        ) : (
          <div style={{ width: CARD_W, height: CARD_H, borderRadius: 12, background: "#e5e5e5" }} />
        )}
        <div
          style={{
            position: "absolute",
            top: -10,
            left: -10,
            width: 36,
            height: 36,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            background: rank === 1 ? "#dc2626" : "#ffffff",
            color: rank === 1 ? "#ffffff" : "#737373",
          }}
        >
          {rank}
        </div>
      </div>
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#ffffff",
          padding: 36,
          fontFamily: "'Space Mono'",
        }}
      >
        {/* Title rail: wordmark / MY TOP 8 / domain, matching the site's brand. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 292,
            paddingRight: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              border: "3px solid #dc2626",
              borderRadius: 999,
              padding: "4px 22px",
              color: "#dc2626",
              fontFamily: "'Fredoka'",
              fontSize: 34,
            }}
          >
            CardMash
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 46, letterSpacing: 2, color: "#171717" }}>
              MY TOP
            </div>
            <div style={{ display: "flex", fontSize: 180, lineHeight: 1, color: "#dc2626", marginLeft: -10 }}>
              8
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#a3a3a3" }}>cardmash.io</div>
        </div>

        {/* The eight cards, two rows of four, rank order left-to-right. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
            flexGrow: 1,
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            {cards.slice(0, 4).map((card, i) => cell(card, i + 1))}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            {cards.slice(4).map((card, i) => cell(card, i + 5))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Space Mono", data: spaceMono, weight: 700 },
        { name: "Fredoka", data: fredoka, weight: 600 },
      ],
    },
  );
}
