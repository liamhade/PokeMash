"use client";

import { useEffect, useRef, useState } from "react";
import { getPlayerId } from "@/lib/playerId";
import { encodeTop8, TOP8_COUNT } from "@/lib/top8";

// Golden circular share trigger for the player's current top eight. Tapping it
// builds a /top8/<code> link (the code packs the card ids — see lib/top8.ts)
// and opens a menu of share targets — X, Reddit, text, copy link, save/copy
// image — instead of the native share sheet, so every platform gets the same
// options. Fetches the top cards fresh at tap time so the link is always the
// TRUE unfiltered top 8, whatever filters or search the rankings list shows.
//
// The image actions reuse the share page's own OG rendering
// (/top8/<code>/opengraph-image): it's fetched same-origin, needs no
// client-side drawing, and always matches what link previews show.

const SHARE_TITLE = "My Top 8 — CardMash";

// The official X and Reddit glyphs (via the CC0 simple-icons set), shown to
// label their share targets — nominative trademark use both brands' guidelines
// permit, as long as the mark isn't altered. Rendered monochrome to match the
// menu's neutral text.
const X_LOGO_PATH =
  "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z";
const REDDIT_LOGO_PATH =
  "M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z";

// A filled single-path brand mark at menu-icon size.
function BrandGlyph({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
  );
}

// A stroked generic glyph at the same size, matching the toolbar's icon style.
function StrokeGlyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function ShareTop8Button() {
  // The /top8/<code> code while the menu is open; null = menu closed.
  const [code, setCode] = useState<string | null>(null);
  // A transient status line ("Link copied") floated under the button.
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  function flash(message: string) {
    setNote(message);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2500);
  }

  // Don't let a pending flash timer fire against an unmounted component.
  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  // Esc or a click anywhere outside the button/menu closes the menu.
  useEffect(() => {
    if (!code) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCode(null);
    };
    const onPress = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setCode(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPress);
    };
  }, [code]);

  async function openMenu() {
    if (code) return setCode(null); // second tap toggles closed
    const playerId = await getPlayerId();
    const res = await fetch(`/api/rankings?playerId=${playerId}&page=0`);
    if (!res.ok) return flash("Something went wrong");
    const data = await res.json();
    const ids = (data.rankings ?? [])
      .slice(0, TOP8_COUNT)
      .map((card: { card_id: string }) => card.card_id);
    const next = encodeTop8(ids);
    if (!next) return flash(`Rank ${TOP8_COUNT}+ cards to share`);
    setCode(next);
  }

  const shareUrl = code ? `${location.origin}/top8/${code}` : "";
  const imageUrl = code ? `/top8/${code}/opengraph-image` : "";

  function openTab(href: string) {
    window.open(href, "_blank", "noopener");
    setCode(null);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCode(null);
    flash("Link copied");
  }

  async function saveImage() {
    const res = await fetch(imageUrl);
    setCode(null);
    if (!res.ok) return flash("Something went wrong");
    const blobUrl = URL.createObjectURL(await res.blob());
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = "cardmash-top8.png";
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  }

  async function copyImage() {
    // ClipboardItem takes the blob as a promise: Safari only allows the write
    // while the user gesture is "live", so the fetch must not happen before it.
    const image = imageUrl;
    setCode(null);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": fetch(image).then((res) => {
            if (!res.ok) throw new Error("og image fetch failed");
            return res.blob();
          }),
        }),
      ]);
      flash("Image copied");
    } catch {
      flash("Couldn't copy image");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openMenu}
        aria-label="Share your top 8"
        aria-expanded={code !== null}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-neutral-900 transition-colors hover:bg-amber-300"
      >
        {/* Share-nodes glyph: three circles joined by two spokes. */}
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="6.5" cy="12" r="2.8" />
          <circle cx="17.5" cy="5.5" r="2.8" />
          <circle cx="17.5" cy="18.5" r="2.8" />
          <line x1="9" y1="10.5" x2="15" y2="7" />
          <line x1="9" y1="13.5" x2="15" y2="17" />
        </svg>
      </button>

      {code && (
        <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
          {(
            [
              {
                label: "Post to X",
                icon: <BrandGlyph path={X_LOGO_PATH} />,
                run: () =>
                  openTab(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TITLE)}&url=${encodeURIComponent(shareUrl)}`,
                  ),
              },
              {
                label: "Post to Reddit",
                icon: <BrandGlyph path={REDDIT_LOGO_PATH} />,
                run: () =>
                  openTab(
                    `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(SHARE_TITLE)}`,
                  ),
              },
              {
                label: "Text a friend",
                // Speech bubble.
                icon: (
                  <StrokeGlyph>
                    <path d="M21 12a8 8 0 0 1-8 8H4l2.4-2.9A8 8 0 1 1 21 12z" />
                  </StrokeGlyph>
                ),
                // sms:?&body= is the one form both iOS and Android accept.
                // Navigate rather than open a tab — popup blockers and _blank
                // don't play well with protocol handlers.
                run: () => {
                  location.href = `sms:?&body=${encodeURIComponent(`${SHARE_TITLE} ${shareUrl}`)}`;
                  setCode(null);
                },
              },
              {
                label: "Copy link",
                // Chain link.
                icon: (
                  <StrokeGlyph>
                    <path d="M10 13a4 4 0 0 0 6 .5l3-3a4 4 0 1 0-5.7-5.6L11.6 6.6" />
                    <path d="M14 11a4 4 0 0 0-6-.5l-3 3a4 4 0 1 0 5.7 5.6l1.7-1.7" />
                  </StrokeGlyph>
                ),
                run: copyLink,
              },
              {
                label: "Save image",
                // Download arrow into a tray.
                icon: (
                  <StrokeGlyph>
                    <path d="M12 3v12m0 0 5-5m-5 5-5-5" />
                    <path d="M4 19h16" />
                  </StrokeGlyph>
                ),
                run: saveImage,
              },
              {
                label: "Copy image",
                // Two stacked squares.
                icon: (
                  <StrokeGlyph>
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </StrokeGlyph>
                ),
                run: copyImage,
              },
            ] as { label: string; icon: React.ReactNode; run: () => void }[]
          ).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.run}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {note && (
        <span className="absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-600 shadow-md">
          {note}
        </span>
      )}
    </div>
  );
}
