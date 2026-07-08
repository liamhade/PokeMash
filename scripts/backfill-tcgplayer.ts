// Matches every card to its TCGplayer product id and stages the result for
// `cards.tcgplayer_product_id`.
//
// Product ids come from tcgcsv.com, a free daily mirror of TCGplayer's catalog
// (categories/groups/products). The join is two-level: each of our `pack` values
// maps to a TCGplayer group, then cards match within the group by collector
// number. Group mapping is SCORED, not trusted from names alone — TCGplayer's
// abbreviations collide with ours (our "Battle Styles (BST)" is their "EX Battle
// Stadium"), so every candidate group found by name or abbreviation is scored by
// what fraction of the pack's collector numbers it actually contains, and the
// best candidate wins only above MIN_GROUP_SCORE.
//
// Like stamp-eligibility.ts, the script writes matches into public.tcgplayer_stage
// over REST (the publishable key may fill it) and finishes by printing the UPDATE
// a DB admin runs to sync cards.tcgplayer_product_id (SQL editor or MCP).
//
// Run with: npx tsx scripts/backfill-tcgplayer.ts
// Re-run after importing new sets. Unmatched cards keep the name-search fallback.

import { readFileSync } from "node:fs";

const PAGE_SIZE = 1000;

// tcgcsv category 3 = Pokémon.
const TCGCSV = "https://tcgcsv.com/tcgplayer/3";

// A pack→group mapping must explain at least half the pack's collector numbers;
// below that the candidates are considered wrong and the pack stays unmatched.
const MIN_GROUP_SCORE = 0.5;

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
    // tcgcsv 401s the default undici agent; any browser-ish/curl-ish UA passes.
    headers: { "User-Agent": "PokeMash-backfill/1.0" },
  });
  if (!res.ok) throw new Error(`tcgcsv ${path}: ${res.status}`);
  return ((await res.json()) as { results: T }).results;
}

type CardRow = { card_id: string; name: string; pack: string | null; collector_number: string | null };
type Group = { groupId: number; name: string; abbreviation: string | null };
type Product = { productId: number; name: string; extendedData?: { name: string; value: string }[] };

// ---- normalization (must treat both sources' spellings identically) --------

// Lowercased ASCII words: accents folded, apostrophes removed (curly ones drop as
// non-ASCII), "&" spelled out so "Black & White" meets "Black and White".
function normText(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/'/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Collector number → comparable key: the part left of "/", alphanumerics only,
// digit runs stripped of leading zeros ("001/086" and "1/86" both key as "1";
// "SWSH001" and "SWSH01" both key as "swsh1").
function normNumber(s: string | null): string | null {
  if (!s) return null;
  const left = s.trim().split("/")[0].trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const key = left.replace(/\d+/g, (run) => String(Number(run)));
  return key || null;
}

// Our packs read "Chaos Rising (CRI)" — name plus an abbreviation in parens.
function splitPack(pack: string): { name: string; abbrev: string | null } {
  const m = pack.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  return m ? { name: m[1], abbrev: m[2] } : { name: pack, abbrev: null };
}

// TCGplayer group names carry set-code prefixes ("SWSH05: Battle Styles",
// "SM - Cosmic Eclipse"); a pack name may equal the full name or the suffix.
function groupNameVariants(name: string): Set<string> {
  const variants = new Set([normText(name)]);
  if (name.includes(":")) variants.add(normText(name.split(":").slice(1).join(":")));
  if (name.includes(" - ")) variants.add(normText(name.split(" - ").slice(1).join(" - ")));
  return variants;
}

// Packs whose names/abbreviations can't be lined up mechanically (TCGplayer merges
// trainer-kit halves, renames promo sets, files "Shiny Vault" under Hidden Fates…).
// Values are TCGplayer groupIds. Keep in sync with new catalog imports.
const PACK_GROUP_ALIASES: Record<string, number> = {
  "Sword & Shield Promos": 2545, // SWSH: Sword & Shield Promo Cards
  "Sword & Shield (SSH)": 2585, // SWSH01: Sword & Shield Base Set
  "Sun & Moon (SUM)": 1863, // SM Base Set
  "HeartGold & SoulSilver Promos": 1453, // HGSS Promos
  "Nintendo Black Star Promos": 1423, // Nintendo Promos
  "Wizards Black Star Promos": 1418, // WoTC Promo
  "Best of Game": 1455, // Best of Promos
  "Shiny Vault": 2594, // Hidden Fates: Shiny Vault (SV1..SV94)
  "Pokémon Trading Card Game Classic—Blastoise (CLB)": 23323, // Trading Card Game Classic
  "Pokémon Trading Card Game Classic—Charizard (CLC)": 23323,
  "Pokémon Trading Card Game Classic—Venusaur (CLV)": 23323,
  "McDonald’s Collection 2011 (MCD11)": 1401, // McDonald's Promos <year>
  "McDonald’s Collection 2012 (MCD12)": 1427,
  "McDonald’s Collection 2016 (MCD16)": 3087,
  "McDonald’s Collection 2019 (MCD19)": 2555,
  "McDonald’s Collection 2021 (MCD21)": 2782, // McDonald's 25th Anniversary Promos
  "McDonald’s Collection 2022 (MCD22)": 3150,
  "Black & White Trainer Kit—Excadrill (TK5E)": 1538, // BW Trainer Kit: Excadrill & Zoroark
  "Black & White Trainer Kit—Zoroark (TK5Z)": 1538,
  "XY Trainer Kit—Bisharp (TK7A)": 1533,
  "XY Trainer Kit—Wigglytuff (TK7B)": 1533,
  "XY Trainer Kit—Latias (TK8A)": 1536,
  "XY Trainer Kit—Latios (TK8O)": 1536,
  "XY Trainer Kit—Pikachu Libre (TK9P)": 1796,
  "XY Trainer Kit—Suicune (TK9S)": 1796,
  "XY Trainer Kit—Sylveon (TK6S)": 1532,
  "XY Trainer Kit—Noivern (TK6N)": 1532,
  "Sun & Moon Trainer Kit—Alolan Raichu (TK10A)": 2069,
  "Sun & Moon Trainer Kit—Lycanroc (TK10L)": 2069,
  "EX Trainer Kit—Latias (TK1A)": 1543,
  "EX Trainer Kit—Latios (TK1O)": 1543,
  "EX Trainer Kit—Minun (TK2M)": 1542,
  "EX Trainer Kit—Plusle (TK2P)": 1542,
  "Diamond & Pearl Trainer Kit—Lucario (TK3L)": 1541,
  "Diamond & Pearl Trainer Kit—Manaphy (TK3M)": 1541,
  "HS Trainer Kit—Gyarados (TK4G)": 1540,
  "HS Trainer Kit—Raichu (TK4R)": 1540,
};

// Sub-sets TCGplayer files as their own group but our packs keep inline (Crown
// Zenith's Galarian Gallery cards live in our "Crown Zenith (CRZ)" pack). A group
// is attached to its parent when its name extends the parent's with one of these.
const GALLERY_WORDS = [
  "Trainer Gallery",
  "Shiny Vault",
  "Galarian Gallery",
  "Radiant Collection",
  "Classic Collection",
];

async function main() {
  // Our catalog, paged over REST.
  const cards: CardRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = (await (
      await rest(
        `cards?select=card_id,name,pack,collector_number&order=card_id&limit=${PAGE_SIZE}&offset=${from}`,
      )
    ).json()) as CardRow[];
    cards.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  console.log(`${cards.length} cards loaded`);

  // TCGplayer catalog: all groups, then every group's products (8-way concurrent).
  const groups = await tcgcsv<Group[]>("groups");
  const productsByGroup = new Map<number, Product[]>();
  const queue = [...groups];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let g = queue.shift(); g; g = queue.shift()) {
        productsByGroup.set(g.groupId, await tcgcsv<Product[]>(`${g.groupId}/products`));
      }
    }),
  );
  console.log(
    `${groups.length} TCGplayer groups, ${[...productsByGroup.values()].reduce((n, p) => n + p.length, 0)} products`,
  );

  // Per-group index: collector-number key → products (a key can hold several
  // variants of the same card, e.g. "Koraidon - 014" and its Staff stamp).
  const productNumber = (p: Product) =>
    p.extendedData?.find((e) => e.name === "Number")?.value ?? null;
  const indexByGroup = new Map<number, Map<string, Product[]>>();
  for (const [gid, products] of productsByGroup) {
    const index = new Map<string, Product[]>();
    for (const p of products) {
      const key = normNumber(productNumber(p));
      if (key) (index.get(key) ?? index.set(key, []).get(key)!).push(p);
    }
    indexByGroup.set(gid, index);
  }

  // Gallery sub-groups fold into their parent's index (numbers never collide:
  // gallery cards carry prefixed numbers like TG21/GG09).
  const galleryIndex = (gid: number): Map<string, Product[]> => {
    const parent = groups.find((g) => g.groupId === gid);
    const merged = new Map(indexByGroup.get(gid) ?? []);
    if (!parent) return merged;
    for (const g of groups) {
      const rest = g.name.startsWith(parent.name) ? g.name.slice(parent.name.length) : null;
      if (rest && GALLERY_WORDS.some((w) => rest.includes(w))) {
        for (const [key, products] of indexByGroup.get(g.groupId) ?? []) {
          merged.set(key, [...(merged.get(key) ?? []), ...products]);
        }
      }
    }
    return merged;
  };

  // Map each pack to a group: alias wins outright; otherwise every group whose
  // name or abbreviation fits is scored by how many of the pack's numbers it holds.
  const cardsByPack = new Map<string, CardRow[]>();
  for (const card of cards) {
    if (!card.pack) continue;
    (cardsByPack.get(card.pack) ?? cardsByPack.set(card.pack, []).get(card.pack)!).push(card);
  }

  const packIndex = new Map<string, Map<string, Product[]>>();
  const unmappedPacks: string[] = [];
  for (const [pack, packCards] of cardsByPack) {
    const alias = PACK_GROUP_ALIASES[pack];
    const { name, abbrev } = splitPack(pack);
    const candidates = alias
      ? [alias]
      : groups
          .filter(
            (g) =>
              groupNameVariants(g.name).has(normText(name)) ||
              (abbrev !== null && g.abbreviation?.toLowerCase() === abbrev.toLowerCase()),
          )
          .map((g) => g.groupId);

    const numbered = packCards
      .map((c) => normNumber(c.collector_number))
      .filter((k): k is string => k !== null && k !== "nonumber");
    let best: { index: Map<string, Product[]>; score: number } | null = null;
    for (const gid of candidates) {
      const index = galleryIndex(gid);
      const hits = numbered.filter((k) => index.has(k)).length;
      const score = numbered.length > 0 ? hits / numbered.length : 0;
      if (!best || score > best.score) best = { index, score };
    }
    if (best && best.score >= MIN_GROUP_SCORE) {
      packIndex.set(pack, best.index);
    } else {
      unmappedPacks.push(`${pack} (${packCards.length} cards)`);
    }
  }
  console.log(`${packIndex.size}/${cardsByPack.size} packs mapped to a TCGplayer group`);
  if (unmappedPacks.length > 0) {
    console.log(`unmapped packs (cards keep the search-link fallback):\n  ${unmappedPacks.join("\n  ")}`);
  }

  // Match cards. Number-key hits holding several products are variant listings of
  // the same card (Staff/Prerelease stamps, merged trainer-kit decks); prefer the
  // one naming our card, then our pack's kit half, then the plain (shortest) name.
  const matches: { card_id: string; product_id: number }[] = [];
  for (const [pack, packCards] of cardsByPack) {
    const index = packIndex.get(pack);
    if (!index) continue;
    const kitHalf = pack.match(/—([^(]+?)(?:\s*\([^)]*\))?$/)?.[1];
    for (const card of packCards) {
      const key = normNumber(card.collector_number);
      let hits = (key && key !== "nonumber" && index.get(key)) || [];
      if (hits.length > 1) {
        const named = hits.filter((p) => normText(p.name).includes(normText(card.name)));
        if (named.length > 0) hits = named;
      }
      if (hits.length > 1 && kitHalf) {
        const half = hits.filter((p) => normText(p.name).includes(normText(kitHalf)));
        if (half.length > 0) hits = half;
      }
      if (hits.length > 1) hits = [...hits].sort((a, b) => a.name.length - b.name.length);
      if (hits.length > 0) matches.push({ card_id: card.card_id, product_id: hits[0].productId });
    }
  }
  console.log(`${matches.length}/${cards.length} cards matched to a product id`);

  // Replace the stage's contents. (PostgREST requires a filter on DELETE; this
  // one matches every row.)
  await rest("tcgplayer_stage?card_id=not.is.null", { method: "DELETE" });
  for (let i = 0; i < matches.length; i += PAGE_SIZE) {
    await rest("tcgplayer_stage", {
      method: "POST",
      body: JSON.stringify(matches.slice(i, i + PAGE_SIZE)),
    });
  }

  // Confirm the stage holds exactly what we computed before telling anyone to sync.
  const head = await rest("tcgplayer_stage?select=card_id&limit=1", {
    method: "HEAD",
    headers: { Prefer: "count=exact" },
  });
  const staged = Number(head.headers.get("content-range")?.split("/")[1]);
  if (staged !== matches.length) {
    throw new Error(`stage holds ${staged} rows, expected ${matches.length}`);
  }

  console.log(`staged ${staged} ids — now sync cards.tcgplayer_product_id by running:\n`);
  console.log(
    `update public.cards c
  set tcgplayer_product_id = s.product_id
  from public.tcgplayer_stage s
  where s.card_id = c.card_id
    and c.tcgplayer_product_id is distinct from s.product_id;
update public.cards
  set tcgplayer_product_id = null
  where tcgplayer_product_id is not null
    and card_id not in (select card_id from public.tcgplayer_stage);`,
  );
}

main();
