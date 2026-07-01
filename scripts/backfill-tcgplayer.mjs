// Backfill cards.tcgplayer_product_id / tcgplayer_url and refresh market_price from
// TCGCSV (a free nightly mirror of TCGplayer's catalog + prices; the official TCGplayer
// API is closed to new devs). Match key: normalized card name + collector number.
//
// Usage:
//   node scripts/backfill-tcgplayer.mjs            # dry run: report match rate, write nothing
//   node scripts/backfill-tcgplayer.mjs --write    # apply: needs SUPABASE_SERVICE_ROLE_KEY
//
// Reads env from .env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
// for reads; SUPABASE_SERVICE_ROLE_KEY for --write). Run nightly once the columns exist to
// keep prices fresh.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const WRITE = process.argv.includes("--write");
const POKEMON_CATEGORY = 3; // TCGplayer/TCGCSV category id for Pokemon
const TCGCSV = "https://tcgcsv.com/tcgplayer";

// --- env -------------------------------------------------------------------
function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env.local — rely on the real environment
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = WRITE
  ? process.env.SUPABASE_SERVICE_ROLE_KEY
  : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    `Missing env. Need NEXT_PUBLIC_SUPABASE_URL and ${
      WRITE ? "SUPABASE_SERVICE_ROLE_KEY (for --write)" : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
    }.`,
  );
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- matching helpers ------------------------------------------------------
// Names: lowercase, drop everything but a–z0–9 so punctuation/accents/spacing differences
// between the two sources don't matter (e.g. "Farfetch'd" vs "Farfetchd").
function normName(name) {
  return (name ?? "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// Numbers: "004/102" -> "4/102", "SWSH001" -> "swsh1"; strips leading zeros in each
// digit run so the two sources' zero-padding differences don't break the match.
function normNumber(value) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9/]/g, "")
    .replace(/\d+/g, (digits) => String(parseInt(digits, 10)));
}

function matchKey(name, number) {
  return `${normName(name)}#${normNumber(number)}`;
}

// --- TCGCSV fetch (with small concurrency) ---------------------------------
async function getJson(url) {
  // TCGCSV 401s the default undici User-Agent, so send a browser-like one.
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (PokeMash backfill; +https://pokemash.app)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function mapPool(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

function numberField(product) {
  return (product.extendedData ?? []).find((entry) => entry.name === "Number")?.value ?? "";
}

// Prefer the holofoil market price (chase printing), else normal, else any subtype.
function nmMarketPrice(prices) {
  const order = ["Holofoil", "Normal", "Reverse Holofoil", "1st Edition Holofoil", "1st Edition"];
  for (const subtype of order) {
    const row = prices.find((p) => p.subTypeName === subtype && p.marketPrice);
    if (row) return row.marketPrice;
  }
  return prices.find((p) => p.marketPrice)?.marketPrice ?? null;
}

// --- main ------------------------------------------------------------------
async function main() {
  console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}`);

  // 1. Load our cards.
  const cards = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("cards")
      .select("card_id, name, collector_number")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    cards.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`Loaded ${cards.length} cards.`);

  // 2. Build a TCGplayer product index keyed by name#number.
  const { results: groups } = await getJson(`${TCGCSV}/${POKEMON_CATEGORY}/groups`);
  console.log(`Fetching products from ${groups.length} TCGplayer groups…`);
  const index = new Map(); // key -> { productId, url }
  const collisions = new Set();
  const priceByProduct = new Map(); // productId -> NM market price (only fetched on --write)

  await mapPool(groups, 8, async (group) => {
    const { results: products } = await getJson(
      `${TCGCSV}/${POKEMON_CATEGORY}/${group.groupId}/products`,
    );
    for (const product of products) {
      const key = matchKey(product.name, numberField(product));
      if (index.has(key)) collisions.add(key);
      else index.set(key, { productId: String(product.productId), url: product.url });
    }
    if (WRITE) {
      const { results: prices } = await getJson(
        `${TCGCSV}/${POKEMON_CATEGORY}/${group.groupId}/prices`,
      );
      const rowsByProduct = new Map();
      for (const price of prices) {
        const rows = rowsByProduct.get(price.productId) ?? [];
        rows.push(price);
        rowsByProduct.set(price.productId, rows);
      }
      for (const [productId, rows] of rowsByProduct) {
        priceByProduct.set(String(productId), nmMarketPrice(rows));
      }
    }
  });
  console.log(`Indexed ${index.size} products (${collisions.size} ambiguous name#number keys).`);

  // 3. Match our cards.
  const matched = [];
  const unmatched = [];
  for (const card of cards) {
    const hit = index.get(matchKey(card.name, card.collector_number));
    if (hit) matched.push({ card, ...hit });
    else unmatched.push(card);
  }
  const pct = Math.round((100 * matched.length) / cards.length);
  console.log(`\nMatched ${matched.length}/${cards.length} (${pct}%). Unmatched: ${unmatched.length}.`);
  console.log("Sample unmatched:", unmatched.slice(0, 8).map((c) => `${c.name} ${c.collector_number}`));

  if (!WRITE) {
    console.log("\nDry run — no writes. Re-run with --write (and SUPABASE_SERVICE_ROLE_KEY) to apply.");
    return;
  }

  // 4. Write matches in batches (product id, url, refreshed NM market price).
  let written = 0;
  for (let i = 0; i < matched.length; i += 500) {
    const rows = matched.slice(i, i + 500).map(({ card, productId, url }) => ({
      card_id: card.card_id,
      tcgplayer_product_id: productId,
      tcgplayer_url: url,
      market_price: priceByProduct.get(productId) ?? null,
    }));
    const { error } = await supabase.from("cards").upsert(rows, { onConflict: "card_id" });
    if (error) throw new Error(error.message);
    written += rows.length;
    console.log(`  wrote ${written}/${matched.length}`);
  }
  console.log(`Done. Updated ${written} cards.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
