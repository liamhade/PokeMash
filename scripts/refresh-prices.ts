// Refreshes the catalog's price columns from TCGplayer's current prices.
//
// Prices come from tcgcsv.com (the same daily TCGplayer mirror the product-id
// backfill uses), joined on cards.tcgplayer_product_id — no name matching needed.
// TCGplayer reports prices per PRINTING (subTypeName): a product can carry Normal,
// Holofoil, Reverse Holofoil, and 1st Edition rows at wildly different prices
// (Shadowless Charizard: $2,146 Unlimited vs $10,000 1st Edition). Our catalog has
// one row per card, so we price the card's base printing: unlimited Normal/Holofoil
// first (Holofoil first when the rarity says Holo), then Reverse Holofoil, and 1st
// Edition only when nothing else is priced — matching what the TCGplayer product
// page features by default.
//
// NEAR-MINT VERIFICATION: the feed's market price is printing-level, not
// condition-level — for scarce vintage it can be carried entirely by played-copy
// sales while the product page's "Near Mint Comparison Prices" line reads N/A
// (Expedition Mew: feed $411.66, page N/A) or a different figure (Expedition
// Feraligatr: feed carried played sales, NM Holofoil is $331.83). The UI labels
// this column "Near Mint Market Price", so for cards at or above
// NM_CHECK_THRESHOLD the script resolves the chosen printing's Near Mint SKU
// (TCGplayer prices per sku = printing × condition × language) and stamps that
// SKU's market price — the exact number the product page shows near-mint — or
// null when TCGplayer has none (the UI renders an em dash, same as cards with no
// price data). Cheap cards keep the feed price unverified: near-mint sales
// dominate their markets anyway, and one request per card is only polite for the
// few thousand where a wrong number would sting.
//
// Like the other stamp scripts, results go into public.price_stage over REST and
// the script prints the UPDATE a DB admin runs to sync (SQL editor or MCP). Cards
// absent from the stage (no product id, or TCGplayer reports no market price) keep
// their existing values. market_price gets TCGplayer's market (recent-sales) price;
// lowest_price/highest_price get the current listing bounds, keeping the columns'
// existing semantics.
//
// Run with: npx tsx scripts/refresh-prices.ts
// Re-run whenever prices feel stale — they move continuously.

import { readFileSync } from "node:fs";

const PAGE_SIZE = 1000;

// tcgcsv category 3 = Pokémon.
const TCGCSV = "https://tcgcsv.com/tcgplayer/3";

// Cards priced at or above this get the near-mint verification requests (~2,500
// distinct products at $25); below it the feed price is trusted as-is.
const NM_CHECK_THRESHOLD = 25;

// TCGplayer's page APIs (public, but undocumented): sku definitions per product,
// and market prices per sku (batched — the ids come from the details call).
const TCG_DETAILS = (productId: number) =>
  `https://mp-search-api.tcgplayer.com/v2/product/${productId}/details`;
const TCG_SKU_PRICES = "https://mpgateway.tcgplayer.com/v1/pricepoints/marketprice/skus/search";
const SKU_PRICE_BATCH = 200;

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

async function rest(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`REST ${path}: ${res.status} ${await res.text()}`);
  return res;
}

async function tcgcsv<T>(path: string): Promise<T> {
  const res = await fetch(`${TCGCSV}/${path}`, {
    // tcgcsv 401s the default undici agent; any custom UA passes.
    headers: { "User-Agent": "PokeMash-backfill/1.0" },
  });
  if (!res.ok) throw new Error(`tcgcsv ${path}: ${res.status}`);
  return ((await res.json()) as { results: T }).results;
}

type CardRow = { card_id: string; rarity: string | null; tcgplayer_product_id: number };
type PriceRow = {
  productId: number;
  subTypeName: string;
  marketPrice: number | null;
  lowPrice: number | null;
  highPrice: number | null;
};

// Rank a printing for "the price of this card": lower is preferred. Tier 1 is the
// unlimited base printing — Holofoil before Normal for Holo rarities (a modern
// "Rare Holo" product can also exist as cheaper non-holo pack filler), Normal first
// otherwise. Reverse Holofoil is a variant, and 1st Edition a collector premium, so
// they only price cards that exist in no other printing.
function printingRank(subTypeName: string, holoRarity: boolean): number {
  const sub = subTypeName.toLowerCase();
  if (sub.includes("1st edition")) return 30;
  if (sub.includes("reverse")) return 20;
  const holoish = sub.includes("holofoil");
  return holoRarity === holoish ? 10 : 11;
}

async function main() {
  // Every card that has a product id; rarity rides along to steer printing choice.
  const cards: CardRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = (await (
      await rest(
        `cards?select=card_id,rarity,tcgplayer_product_id&tcgplayer_product_id=not.is.null&order=card_id&limit=${PAGE_SIZE}&offset=${from}`,
      )
    ).json()) as CardRow[];
    cards.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  console.log(`${cards.length} cards with a TCGplayer product id`);

  // Current prices for every group (8-way concurrent), indexed by productId.
  const groups = await tcgcsv<{ groupId: number }[]>("groups");
  const pricesByProduct = new Map<number, PriceRow[]>();
  const queue = [...groups];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let g = queue.shift(); g; g = queue.shift()) {
        for (const row of await tcgcsv<PriceRow[]>(`${g.groupId}/prices`)) {
          (pricesByProduct.get(row.productId) ?? pricesByProduct.set(row.productId, []).get(row.productId)!).push(row);
        }
      }
    }),
  );
  console.log(`prices for ${pricesByProduct.size} products across ${groups.length} groups`);

  // Pick each card's best-ranked printing that actually has a market price.
  // product_id/printing ride along for the near-mint verification below.
  const picks: {
    card_id: string;
    product_id: number;
    printing: string;
    market_price: number | null;
    lowest_price: number | null;
    highest_price: number | null;
  }[] = [];
  for (const card of cards) {
    const holoRarity = card.rarity?.toLowerCase().includes("holo") ?? false;
    const priced = (pricesByProduct.get(card.tcgplayer_product_id) ?? [])
      .filter((row) => row.marketPrice !== null)
      .sort((a, b) => printingRank(a.subTypeName, holoRarity) - printingRank(b.subTypeName, holoRarity));
    if (priced.length === 0) continue;
    picks.push({
      card_id: card.card_id,
      product_id: card.tcgplayer_product_id,
      printing: priced[0].subTypeName,
      market_price: priced[0].marketPrice,
      lowest_price: priced[0].lowPrice,
      highest_price: priced[0].highPrice,
    });
  }
  console.log(`${picks.length}/${cards.length} cards priced (rest keep their old values)`);

  // Near-mint verification (see the header). One details request per DISTINCT
  // product resolves its Near Mint sku per printing; sku market prices then come
  // back in batched lookups. Verified cards get the NM sku's market price — or
  // null when TCGplayer has no NM price — while a failed details request keeps
  // the feed price: only a positive answer from TCGplayer may change a number.
  type Sku = { sku: number; condition: string; variant: string; language: string };
  type SkuPrice = { skuId: number; marketPrice: number | null };
  const verifyProducts = [
    ...new Set(
      picks
        .filter((p) => p.market_price !== null && p.market_price >= NM_CHECK_THRESHOLD)
        .map((p) => p.product_id),
    ),
  ];
  const total = verifyProducts.length;
  // product -> printing (lowercased) -> NM skuId; only products whose details call
  // succeeded are present, so absence below means "no evidence", not "no price".
  const nmSkuByProduct = new Map<number, Map<string, number>>();
  let checked = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let pid = verifyProducts.shift(); pid !== undefined; pid = verifyProducts.shift()) {
        try {
          const res = await fetch(TCG_DETAILS(pid), {
            headers: { "User-Agent": "PokeMash-backfill/1.0" },
          });
          if (!res.ok) throw new Error(String(res.status));
          const skus = ((await res.json()) as { skus: Sku[] }).skus ?? [];
          const byPrinting = new Map<string, number>();
          for (const sku of skus) {
            if (sku.condition === "Near Mint" && sku.language === "English") {
              byPrinting.set(sku.variant.toLowerCase(), sku.sku);
            }
          }
          nmSkuByProduct.set(pid, byPrinting);
        } catch {
          // keep the feed price for this product
        }
        if (++checked % 500 === 0) console.log(`  sku lookups ${checked}/${total}`);
      }
    }),
  );

  // Batched market prices for every NM sku found. A sku the response omits or
  // prices at null has no near-mint market — that's TCGplayer saying N/A.
  const nmPriceBySku = new Map<number, number>();
  const skuIds = [...nmSkuByProduct.values()].flatMap((m) => [...m.values()]);
  for (let i = 0; i < skuIds.length; i += SKU_PRICE_BATCH) {
    const batch = skuIds.slice(i, i + SKU_PRICE_BATCH);
    const res = await fetch(TCG_SKU_PRICES, {
      method: "POST",
      headers: { "User-Agent": "PokeMash-backfill/1.0", "Content-Type": "application/json" },
      body: JSON.stringify({ skuIds: batch }),
    });
    if (!res.ok) throw new Error(`sku prices: ${res.status}`);
    for (const row of (await res.json()) as SkuPrice[]) {
      if (row.marketPrice !== null) nmPriceBySku.set(row.skuId, row.marketPrice);
    }
  }

  let stamped = 0;
  let nulled = 0;
  for (const pick of picks) {
    const byPrinting = nmSkuByProduct.get(pick.product_id);
    if (
      byPrinting === undefined ||
      pick.market_price === null ||
      pick.market_price < NM_CHECK_THRESHOLD
    ) {
      continue;
    }
    const skuId = byPrinting.get(pick.printing.toLowerCase());
    const nmPrice = skuId !== undefined ? nmPriceBySku.get(skuId) : undefined;
    if (nmPrice !== undefined) {
      pick.market_price = nmPrice;
      stamped++;
    } else {
      pick.market_price = null;
      nulled++;
    }
  }
  console.log(
    `near-mint check: ${nmSkuByProduct.size}/${total} products verified — ${stamped} cards stamped with the NM price, ${nulled} nulled (no NM market)`,
  );

  const staged = picks.map(({ card_id, market_price, lowest_price, highest_price }) => ({
    card_id,
    market_price,
    lowest_price,
    highest_price,
  }));

  // Replace the stage's contents. (PostgREST requires a filter on DELETE; this
  // one matches every row.)
  await rest("price_stage?card_id=not.is.null", { method: "DELETE" });
  for (let i = 0; i < staged.length; i += PAGE_SIZE) {
    await rest("price_stage", {
      method: "POST",
      body: JSON.stringify(staged.slice(i, i + PAGE_SIZE)),
    });
  }

  // Confirm the stage holds exactly what we computed before telling anyone to sync.
  const head = await rest("price_stage?select=card_id&limit=1", {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  });
  const count = Number(head.headers.get("content-range")?.split("/")[1]);
  if (count !== staged.length) {
    throw new Error(`stage holds ${count} rows, expected ${staged.length}`);
  }

  console.log(`staged ${count} price rows — now sync the cards columns by running:\n`);
  console.log(
    `update public.cards c
  set market_price = s.market_price,
      lowest_price = s.lowest_price,
      highest_price = s.highest_price
  from public.price_stage s
  where s.card_id = c.card_id
    and (c.market_price is distinct from s.market_price
      or c.lowest_price is distinct from s.lowest_price
      or c.highest_price is distinct from s.highest_price);`,
  );
}

main();
