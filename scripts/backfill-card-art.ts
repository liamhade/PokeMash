// Backfills the `card-art` storage bucket with pre-resized card art.
//
// Why: card art was hotlinked from pkmncards.com through Vercel's image optimizer,
// whose free-tier transformation quota the catalog blew through (images then 402).
// This script downloads each servable card's JPEG once, resizes it to the app's
// retina display size, and uploads it to Supabase Storage as {card_id}.webp. After
// a run, point cards.art_url at the uploaded objects (see scripts/README note in
// DONE.md) — the app serves art_url and falls back to image_url.
//
// Scope: the eligible comparison pool (the stamped cards.eligible column — run
// scripts/stamp-eligibility.ts first) PLUS every card that already appears in
// card_ranks (rankings can show cards that later fell out of the pool).
//
// Run with: npx tsx scripts/backfill-card-art.ts
// Idempotent: cards whose object already exists in the bucket are skipped, so an
// interrupted run can simply be restarted. Re-run it when new sets are imported.
//
// Requires the temporary anon INSERT policy on storage.objects for this bucket
// (the repo only holds the publishable key); drop the policy after the run.

import { readFileSync } from "node:fs";

// The Play screen renders cards at 325 CSS px wide; store 2x for retina screens.
const TARGET_WIDTH = 650;
const WEBP_QUALITY = 80;
const BUCKET = "card-art";
const CONCURRENCY = 5; // polite to pkmncards.com — we're a guest on their bandwidth
const PAGE_SIZE = 1000;
const RETRIES = 3;
// A real browser UA: pkmncards serves plain curl-style agents a bot challenge.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";

// .env.local is the only place the Supabase URL/key live locally (gitignored).
function loadEnv(): { url: string; key: string } {
  const lines = readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n");
  const env = Object.fromEntries(
    lines.filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("missing Supabase URL/key in .env.local");
  return { url, key };
}

const { url: SUPABASE_URL, key: ANON_KEY } = loadEnv();

async function rest<T>(path: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`REST ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Every card the app can serve art for: the eligible pool plus already-ranked ids.
async function collectTargets(): Promise<Map<string, string>> {
  const targets = new Map<string, string>(); // card_id -> image_url

  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await rest<{ card_id: string; image_url: string | null }[]>(
      `cards?select=card_id,image_url&eligible=eq.true&order=card_id&limit=${PAGE_SIZE}&offset=${from}`,
    );
    for (const row of page) {
      if (row.image_url) targets.set(row.card_id, row.image_url);
    }
    if (page.length < PAGE_SIZE) break;
  }

  // Ranked cards outside the eligible pool (looser past rules) still show in the
  // rankings list, so they need art too; fetch the stragglers by id.
  const rankedIds = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await rest<{ card_id: string }[]>(
      `card_ranks?select=card_id&order=player_id,card_id&limit=${PAGE_SIZE}&offset=${from}`,
    );
    for (const row of page) rankedIds.add(row.card_id);
    if (page.length < PAGE_SIZE) break;
  }
  const missing = [...rankedIds].filter((id) => !targets.has(id));
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    const rows = await rest<{ card_id: string; image_url: string | null }[]>(
      `cards?select=card_id,image_url&card_id=in.(${chunk.join(",")})`,
    );
    for (const row of rows) if (row.image_url) targets.set(row.card_id, row.image_url);
  }
  return targets;
}

async function fetchWithRetry(input: string, init: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(input, { ...init, signal: AbortSignal.timeout(30_000) });
      // 4xx won't heal on retry; throw straight out to the caller.
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      throw new Error(`status ${res.status}`);
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

const objectUrl = (id: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${id}.webp`;

async function processCard(
  sharp: typeof import("sharp"),
  id: string,
  imageUrl: string,
): Promise<"uploaded" | "skipped"> {
  // Already uploaded on a previous (possibly interrupted) run?
  const head = await fetch(objectUrl(id), { method: "HEAD" });
  if (head.ok) return "skipped";

  const source = await fetchWithRetry(imageUrl, { headers: { "User-Agent": UA } });
  if (!source.ok) throw new Error(`source ${source.status}`);
  const webp = await sharp.default(Buffer.from(await source.arrayBuffer()))
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const upload = await fetchWithRetry(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${id}.webp`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "image/webp",
      "Cache-Control": "max-age=31536000",
    },
    body: webp,
  });
  if (!upload.ok) throw new Error(`upload ${upload.status} ${await upload.text()}`);
  return "uploaded";
}

async function main() {
  const sharp = await import("sharp");
  const targets = await collectTargets();
  console.log(`${targets.size} cards to ensure in ${BUCKET}`);

  const queue = [...targets.entries()];
  const failures: [string, string][] = [];
  let uploaded = 0;
  let skipped = 0;
  let done = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        const [id, imageUrl] = next;
        try {
          const result = await processCard(sharp, id, imageUrl);
          if (result === "uploaded") uploaded++;
          else skipped++;
        } catch (error) {
          failures.push([id, (error as Error).message]);
        }
        if (++done % 100 === 0) {
          console.log(`${done}/${targets.size} (${uploaded} uploaded, ${skipped} already present, ${failures.length} failed)`);
        }
      }
    }),
  );

  console.log(`done: ${uploaded} uploaded, ${skipped} already present, ${failures.length} failed`);
  for (const [id, message] of failures) console.log(`FAILED ${id}: ${message}`);
  if (failures.length > 0) process.exitCode = 1;
}

main();
