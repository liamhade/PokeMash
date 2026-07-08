import { EXCLUDED_TRAINER_NAMES } from "@/lib/excludedTrainerNames";

// --- Comparison pool eligibility -------------------------------------------
// Comparing Common/Uncommon cards is boring, and "interesting" differs by era.
// These rules decide which cards may appear on the Play screen — and, because the
// rankings progress meter measures progress against the same servable pool, they
// also produce its denominator.
//
// These rules are the SOURCE, not the runtime check: scripts/stamp-eligibility.ts
// evaluates them over the catalog and stamps the result into `cards.eligible`,
// which is what the API routes filter on. Re-run the stamp (and the art backfill)
// after importing new sets or changing anything here.

// Always excluded: boring base rarities + the modern ex card ("Double Rare",
// which is framed art, not full art). Excluded server-side via a `not in` filter —
// DROP_RARITIES_FILTER is the quoted PostgREST list for that (quoted so values
// with spaces, like "No Rarity", parse).
export const DROP_RARITIES = ["Common", "Uncommon", "No Rarity", "Double Rare"];
export const DROP_RARITIES_FILTER = `(${DROP_RARITIES.map((rarity) => `"${rarity}"`).join(",")})`;

// The card fields the eligibility rules read. Callers pass richer row types; this
// is just the slice isEligible needs.
export type EligibilityRow = {
  name: string;
  rarity: string;
  release_date: string | null;
};

// A non-buzzword "Rare" is only worth comparing if it's genuinely vintage: HeartGold
// & SoulSilver (ends Feb 2011) and earlier. The modern era begins with Black & White
// (starts Mar 2011). The boundary falls inside 2011, so we compare full release dates
// (free text like "Apr 25, 2011"), not just the year.
const MODERN_ERA_START = new Date("2011-03-01");
function isVintage(releaseDate: string | null): boolean {
  if (!releaseDate) return false;
  const date = new Date(releaseDate.trim());
  return !Number.isNaN(date.getTime()) && date < MODERN_ERA_START;
}

// Energy cards aren't fun to compare, so drop them. They're named "<X> Energy"
// (optionally with element symbols like "{G}" or a "Prism Star" tag), so we anchor
// on "Energy" being the LAST word after stripping those. This deliberately keeps
// trainers like "Energy Retrieval" / "Ancient Booster Energy Capsule" (Energy is
// not the final word). Done by name because the data has no card-type column.
function isEnergyCard(name: string): boolean {
  const stripped = name
    .replace(/\{[^}]*\}/g, "") // element symbols, e.g. {G}{R}
    .replace(/prism star/gi, "") // subtype tag, e.g. "Beast Energy Prism Star"
    .replace(/\s+/g, " ")
    .trim();
  return /\bEnergy$/i.test(stripped);
}

// "Promo", "Rare" and "Rare Holo" are catch-all rarities that lump boring non-holos
// / plain modern foils in with the occasional buzzword chase card (e.g. "Deoxys ex",
// "Umbreon Star"). We keep such a card only when its name carries a featured mechanic.
// Full-art cards always get their own distinct rarity (e.g. Reshiram 113/114 is
// "Ultra Rare"), so this never drops a full art. The mechanic is a trailing token,
// so we anchor on the name's end.
const FEATURED_MECHANIC = /(\bGX|\bVMAX|\bVSTAR|\bV|\bex|\bEX|\bLV\.?X|\bBREAK|\bPrime|\bLEGEND|\bStar|★)$/;
function hasFeaturedMechanic(name: string): boolean {
  return FEATURED_MECHANIC.test(name.trim());
}

// Rarities judged by name/era rather than rarity alone: a "Rare"/"Rare Holo" is kept
// with a featured mechanic OR if genuinely vintage (pre-Black & White); a "Promo"
// only with a mechanic (a promo has no reliable date-era meaning).
const VINTAGE_ELIGIBLE_RARITIES = new Set(["Rare", "Rare Holo"]);

// Trainer "Item", "Stadium", and "Pokémon Tool" cards aren't fun to compare. The data
// has no card-type column, so we match by name against a list pulled from the Pokemon
// TCG API (see excludedTrainerNames.ts). This normalization MUST match how that list
// was generated.
function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "") // drop non-ASCII (incl. combining accents)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ") // punctuation -> space, so apostrophes etc. don't matter
    .replace(/\s+/g, " ")
    .trim();
}

// The rules a SQL `not in` filter can't express: drop energy cards and Item/Stadium/
// Tool trainers; keep a "Promo" only with a featured mechanic; keep a "Rare"/"Rare Holo"
// with a featured mechanic OR if it's genuinely vintage. (The always-dropped rarities
// are excluded in the query.)
export function isEligible(row: EligibilityRow): boolean {
  if (isEnergyCard(row.name)) return false;
  if (EXCLUDED_TRAINER_NAMES.has(normalizeName(row.name))) return false;
  if (row.rarity === "Promo") return hasFeaturedMechanic(row.name);
  if (VINTAGE_ELIGIBLE_RARITIES.has(row.rarity))
    return hasFeaturedMechanic(row.name) || isVintage(row.release_date);
  return true;
}

// The complete pool rule — the rarity drop plus the name/era rules — i.e. what
// `cards.eligible` is stamped with. isEligible alone assumes the dropped rarities
// were already excluded by the caller's query.
export function isPoolEligible(row: EligibilityRow): boolean {
  return !DROP_RARITIES.includes(row.rarity) && isEligible(row);
}

// --- Series filter ----------------------------------------------------------

// "Legendary Collection" is a curated pseudo-series: in the data it's a `pack` inside the
// `Other` set, not a `set` of its own. We expose it as its own filter option and carve it
// out of the `Other` option, both handled by matchesSeries (and mapped to the `Other` set
// for DB windowing). LEGENDARY_COLLECTION is the filter token; the PACK is its data value.
export const LEGENDARY_COLLECTION = "Legendary Collection";
export const LEGENDARY_COLLECTION_PACK = "Legendary Collection (LC)";

// True if the card belongs to any selected series. Most series are matched on the `set`
// column; the two exceptions keep Legendary Collection and Other disjoint: "Legendary
// Collection" matches its pack, and "Other" matches the Other set MINUS that pack. No
// series selected means "no series filter", so everything passes.
export function matchesSeries(
  row: { set: string | null; pack: string | null },
  series: string[],
): boolean {
  if (series.length === 0) return true;
  return series.some((name) => {
    if (name === LEGENDARY_COLLECTION) return row.pack === LEGENDARY_COLLECTION_PACK;
    if (name === "Other") return row.set === "Other" && row.pack !== LEGENDARY_COLLECTION_PACK;
    return row.set === name;
  });
}
