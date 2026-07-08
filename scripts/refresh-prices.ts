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
// NEAR-MINT VERIFICATION (vintage only): the feed's market price is
// printing-level, not condition-level — for scarce vintage it can be carried
// entirely by played-copy sales while the product page's "Near Mint Comparison
// Prices" line reads N/A (Expedition Mew: feed $411.66, page N/A) or a different
// figure (Expedition Feraligatr: NM Holofoil is $331.83). The UI labels this
// column "Near Mint Market Price", so for VINTAGE cards (pre-Black & White, the
// isVintage boundary) at or above NM_CHECK_THRESHOLD the script resolves the
// chosen printing's Near Mint SKU (TCGplayer prices per sku = printing ×
// condition × language) and stamps that SKU's market price — the exact number
// the product page shows near-mint — or null when TCGplayer has none (the UI
// renders an em dash, same as cards with no price data). Modern cards always
// keep the feed price: they trade near-mint constantly, so feed ≈ NM there.
//
// FIRST EDITION: our art for the WOTC packs that had 1st Edition print runs
// (FIRST_EDITION_SCAN_PACKS) is scanned from 1st Edition copies — the stamp is
// visible on the card — so pricing those cards' Unlimited printing would
// contradict the picture. Cards in those packs are ALWAYS verified (any price)
// against their 1st Edition NM sku. Base Set is the special case: TCGplayer
// files its 1st Edition (= Shadowless) cards under the separate "Base Set
// (Shadowless)" group, so Base Set cards resolve their NM sku on the Shadowless
// product matched by collector number instead.
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
import { isVintage } from "../src/lib/comparisonPool";

const PAGE_SIZE = 1000;

// tcgcsv category 3 = Pokémon.
const TCGCSV = "https://tcgcsv.com/tcgplayer/3";

// Vintage cards priced at or above this get the near-mint verification requests;
// below it the feed price is trusted as-is. (First-edition packs are always
// verified regardless of price — see the header.)
const NM_CHECK_THRESHOLD = 25;

// WOTC packs whose pkmncards scans show the 1st Edition stamp (verified by eye:
// Base Set, Jungle, Gym Heroes, Team Rocket, Neo Genesis/Discovery all carry it).
// Base Set 2, Legendary Collection, Southern Islands, promos, and everything from
// E-Card on had no 1st Edition print run, so their scans can't mismatch.
const FIRST_EDITION_SCAN_PACKS = new Set([
  "Base Set (BS)",
  "Jungle (JU)",
  "Fossil (FO)",
  "Team Rocket (RO)",
  "Gym Heroes (G1)",
  "Gym Challenge (G2)",
  "Neo Genesis (N1)",
  "Neo Discovery (N2)",
  "Neo Revelation (N3)",
  "Neo Destiny (N4)",
]);
// Base Set 1st Editions live in TCGplayer's separate Shadowless group.
const BASE_SET_PACK = "Base Set (BS)";
const SHADOWLESS_GROUP_ID = 1663;

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

type CardRow = {
  card_id: string;
  rarity: string | null;
  pack: string | null;
  release_date: string | null;
  collector_number: string | null;
  tcgplayer_product_id: number;
};
type PriceRow = {
  productId: number;
  subTypeName: string;
  marketPrice: number | null;
  lowPrice: number | null;
  highPrice: number | null;
};

// Rank a printing for "the price of this card": lower is preferred. Tier 1 is the
// card's base printing — 1st Edition for the packs whose scans show the stamp,
// unlimited otherwise — with Holofoil before Normal for Holo rarities (a modern
// "Rare Holo" product can also exist as cheaper non-holo pack filler). Reverse
// Holofoil is a variant, and printings from the wrong edition only price cards
// that exist in no other printing.
function printingRank(subTypeName: string, holoRarity: boolean, firstEdition: boolean): number {
  const sub = subTypeName.toLowerCase();
  if (sub.includes("reverse")) return 20;
  if (sub.includes("1st edition") !== firstEdition) return 30;
  const holoish = sub.includes("holofoil");
  return holoRarity === holoish ? 10 : 11;
}

async function main() {
  // Every card that has a product id; rarity rides along to steer printing choice.
  const cards: CardRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = (await (
      await rest(
        `cards?select=card_id,rarity,pack,release_date,collector_number,tcgplayer_product_id&tcgplayer_product_id=not.is.null&order=card_id&limit=${PAGE_SIZE}&offset=${from}`,
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

  // Base Set cards resolve their NM sku on the Shadowless product with the same
  // collector number (see the header), so index that group's products by number.
  type Product = { productId: number; extendedData?: { name: string; value: string }[] };
  // Left of "/", leading zeros stripped: the Shadowless group zero-pads ("004/102")
  // where our catalog doesn't ("4/102"). Same normalization as backfill-tcgplayer.
  const numberKey = (value: string | null) => {
    const left = value?.trim().split("/")[0].trim().toLowerCase();
    return left ? left.replace(/\d+/g, (run) => String(Number(run))) : null;
  };
  const shadowlessByNumber = new Map<string, number>();
  for (const product of await tcgcsv<Product[]>(`${SHADOWLESS_GROUP_ID}/products`)) {
    const key = numberKey(product.extendedData?.find((e) => e.name === "Number")?.value ?? null);
    if (key) shadowlessByNumber.set(key, product.productId);
  }

  // Pick each card's best-ranked printing that actually has a market price.
  // The verification fields ride along: which product to resolve the NM sku on,
  // and whether this card must be priced as a 1st Edition.
  const picks: {
    card_id: string;
    printing: string;
    holoRarity: boolean;
    firstEdition: boolean;
    nmProductId: number | undefined;
    verify: boolean;
    market_price: number | null;
    lowest_price: number | null;
    highest_price: number | null;
  }[] = [];
  for (const card of cards) {
    const holoRarity = card.rarity?.toLowerCase().includes("holo") ?? false;
    const firstEdition = card.pack !== null && FIRST_EDITION_SCAN_PACKS.has(card.pack);
    const priced = (pricesByProduct.get(card.tcgplayer_product_id) ?? [])
      .filter((row) => row.marketPrice !== null)
      .sort(
        (a, b) =>
          printingRank(a.subTypeName, holoRarity, firstEdition) -
          printingRank(b.subTypeName, holoRarity, firstEdition),
      );
    if (priced.length === 0) continue;
    const market = priced[0].marketPrice;
    picks.push({
      card_id: card.card_id,
      printing: priced[0].subTypeName,
      holoRarity,
      firstEdition,
      nmProductId:
        card.pack === BASE_SET_PACK
          ? shadowlessByNumber.get(numberKey(card.collector_number) ?? "")
          : card.tcgplayer_product_id,
      verify:
        firstEdition ||
        (isVintage(card.release_date) && market !== null && market >= NM_CHECK_THRESHOLD),
      market_price: market,
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
        .filter((p) => p.verify && p.nmProductId !== undefined)
        .map((p) => p.nmProductId as number),
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

  // Which NM sku prices this card: for 1st Edition packs, any "1st edition"
  // variant (holo-matched when there's a choice — the pack's holos and non-holos
  // are separate skus); otherwise the exact printing the feed pick chose.
  function nmSkuFor(pick: (typeof picks)[number], byPrinting: Map<string, number>): number | undefined {
    if (!pick.firstEdition) return byPrinting.get(pick.printing.toLowerCase());
    const candidates = [...byPrinting.keys()].filter((v) => v.includes("1st edition"));
    const holoMatched = candidates.filter((v) => v.includes("holofoil") === pick.holoRarity);
    const variant = holoMatched[0] ?? candidates[0];
    return variant === undefined ? undefined : byPrinting.get(variant);
  }

  let stamped = 0;
  let nulled = 0;
  for (const pick of picks) {
    if (!pick.verify || pick.nmProductId === undefined) continue;
    const byPrinting = nmSkuByProduct.get(pick.nmProductId);
    if (byPrinting === undefined) continue; // details fetch failed: keep the feed price
    const skuId = nmSkuFor(pick, byPrinting);
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
