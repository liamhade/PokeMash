import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_RATING } from "@/lib/glicko2";
import { ITEM_STADIUM_NAMES } from "@/lib/itemStadiumNames";

type Card = { card_id: string; name: string; image_url: string };
// A card joined with this player's Glicko-2 rating for it (r, rd, mu).
type RatedCard = Card & { r: number; rd: number; mu: number };
// The extra columns we need to decide pool eligibility (not sent to the client).
type CardRow = Card & { rarity: string; release_date: string | null };

// --- Comparison pool eligibility -------------------------------------------
// Comparing Common/Uncommon cards is boring, and "interesting" differs by era.
// These rules decide which cards may appear on the Play screen.
//
// NOTE: this logic is mirrored in supabase/migrations/20260630_comparison_pool.sql.
// For now it lives here (the app's read-only key can't create that DB function);
// move it into the database when someone with DB access can apply the migration.

// Always excluded: boring base rarities + the modern ex card ("Double Rare",
// which is framed art, not full art). Excluded server-side via a `not in` filter.
const DROP_RARITIES = ["Common", "Uncommon", "No Rarity", "Double Rare"];

// Cards to pull per request — a random window into the eligible pool so repeat
// visits don't always surface the same cards.
const POOL_SAMPLE_SIZE = 1000;

// A restrictive filter can leave a given random window with fewer than two eligible
// cards. Resample with a fresh offset up to this many times before reporting an empty
// pool (no effect when the pool already fits in one window).
const SAMPLE_RETRIES = 4;

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

// --- User-controlled filters (price / era / series) ------------------------
// Optional filters the player sets via the Filter modal, layered on top of the
// always-on rarity rules above. Series and price are pushed into the DB query;
// era is applied in JS here because release_date is free text the DB can't
// compare by year.

// Era buckets by release year. These are TCG eras, not literal 10-year decades:
// vintage = WOTC→Platinum/HGSS, middle = Black & White→Sun & Moon, modern =
// Sword & Shield onward. Boundaries align with the rough year a new base era began.
const ERA_YEAR_RANGES: Record<string, [number, number]> = {
  vintage: [0, 2010],
  middle: [2011, 2019],
  modern: [2020, 9999],
};

// Which `set` (series) values to draw on for each era. The random sample window is
// contiguous, so an era filter applied only in JS would often miss the era's rows
// entirely; pre-filtering the DB query to these series keeps the window era-relevant,
// and matchesEras() then trims to the exact release year. A series is listed under an
// era only where it has SUBSTANTIAL volume — boundary series that merely graze an era
// (HGSS's 2011 tail, Sword & Shield's lone 2019 set, Sun & Moon's 2020–21 tail) are
// left off that era so they don't dilute the window with rows the year-check discards.
// The long, continuously-printed catch-alls (Promos, Other) really do span, so they
// stay in every era. Regenerate when the catalog gains new series.
const ERA_SETS: Record<string, string[]> = {
  vintage: ["Classic", "Promos", "Neo", "Gym", "Other", "E-Card", "EX", "POP", "Trainer Kits", "Diamond & Pearl", "Platinum", "HeartGold & SoulSilver"],
  middle: ["Promos", "Other", "Trainer Kits", "Black & White", "XY", "Sun & Moon", "Collections"],
  modern: ["Promos", "Other", "Sword & Shield", "Scarlet & Violet", "Misc.", "Mega Evolution"],
};

function releaseYear(releaseDate: string | null): number | null {
  if (!releaseDate) return null;
  const date = new Date(releaseDate.trim());
  return Number.isNaN(date.getTime()) ? null : date.getFullYear();
}

// True if the card's release year falls in any of the selected eras. No eras
// selected means "no era filter", so everything passes.
function matchesEras(releaseDate: string | null, eras: string[]): boolean {
  if (eras.length === 0) return true;
  const year = releaseYear(releaseDate);
  if (year === null) return false;
  return eras.some((era) => {
    const range = ERA_YEAR_RANGES[era];
    return range !== undefined && year >= range[0] && year <= range[1];
  });
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

// Trainer "Item" and "Stadium" cards aren't fun to compare. The data has no card-type
// column, so we match by name against a list pulled from the Pokemon TCG API (see
// itemStadiumNames.ts). This normalization MUST match how that list was generated.
function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\x00-\x7f]/g, "") // drop non-ASCII (incl. combining accents)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ") // punctuation -> space, so apostrophes etc. don't matter
    .replace(/\s+/g, " ")
    .trim();
}

// The rules a SQL `not in` filter can't express: drop energy cards and Item/Stadium
// trainers; keep a "Promo" only with a featured mechanic; keep a "Rare"/"Rare Holo"
// with a featured mechanic OR if it's genuinely vintage. (The always-dropped rarities
// are excluded in the query.)
function isEligible(row: CardRow): boolean {
  if (isEnergyCard(row.name)) return false;
  if (ITEM_STADIUM_NAMES.has(normalizeName(row.name))) return false;
  if (row.rarity === "Promo") return hasFeaturedMechanic(row.name);
  if (VINTAGE_ELIGIBLE_RARITIES.has(row.rarity))
    return hasFeaturedMechanic(row.name) || isVintage(row.release_date);
  return true;
}

// Fisher-Yates in-place shuffle. We shuffle the card pool per request so that
// players whose ratings are still tied (e.g. everything at the default rd=350)
// don't all get served the same opening comparisons.
function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Picks the maximally informative pair from the pool: the card we know least
 * about (highest rating deviation `rd`) paired with its nearest rival by rating
 * (`r`). A close, uncertain matchup teaches the model more than a random one.
 */
function information_rich_pair(cards: RatedCard[]): [RatedCard, RatedCard] {
  const cardA = [...cards].sort((x, y) => y.rd - x.rd)[0];
  const cardB = cards
    .filter((card) => card.card_id !== cardA.card_id)
    .sort((x, y) => Math.abs(x.r - cardA.r) - Math.abs(y.r - cardA.r))[0];
  return [cardA, cardB];
}

// Challenger-selection knobs for Keep Winner mode. Always taking the single nearest
// rating gives the most informative matchup but keeps surfacing the same narrow power
// band, so we add novelty two ways: usually pick at random from the SOFT_BAND_SIZE
// closest cards (close but varied), and EXPLORE_EPSILON of the time pick a completely
// random unseen card (a wildcard from anywhere in the pool).
const SOFT_BAND_SIZE = 30;
const EXPLORE_EPSILON = 0.3;

/**
 * Given a fixed `winner` the player wants to keep on screen, choose the fresh card to
 * face it next. Prefers cards the winner has never faced. Then, to balance close
 * matchups against novelty: with probability EXPLORE_EPSILON return a random unseen
 * card; otherwise return a random card from the SOFT_BAND_SIZE nearest by rating.
 */
function supply_winner_with_fresh_card(
  winner: RatedCard,
  candidates: RatedCard[],
  comparedOpponentIds: Set<string>,
): RatedCard {
  const pool = candidates.filter((card) => card.card_id !== winner.card_id);
  const unseen = pool.filter((card) => !comparedOpponentIds.has(card.card_id));
  // Fall back to the full pool only once every card has already faced the winner.
  const choices = unseen.length > 0 ? unseen : pool;

  // Explore: a completely random card, to break out of the rating band.
  if (Math.random() < EXPLORE_EPSILON) {
    return choices[Math.floor(Math.random() * choices.length)];
  }
  // Exploit (soft band): a random card from the nearest-by-rating group (tie-break:
  // higher rd), not always the single closest — keeps the matchup close but varied.
  const band = [...choices]
    .sort((x, y) => Math.abs(x.r - winner.r) - Math.abs(y.r - winner.r) || y.rd - x.rd)
    .slice(0, SOFT_BAND_SIZE);
  return band[Math.floor(Math.random() * band.length)];
}

// Picks the next pair of cards for a player to compare.
// Query: ?playerId=...  and optionally &winnerId=... (Keep Winner mode: returns
// the winner plus one fresh challenger instead of a brand-new pair).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const playerId = params.get("playerId");
  const winnerId = params.get("winnerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  // Optional Filter-modal selections. Multi-value filters arrive comma-separated;
  // prices are parsed to numbers (ignored if blank/NaN). Empty = filter not applied.
  const seriesFilter = (params.get("series") ?? "").split(",").filter(Boolean);
  const eraFilter = (params.get("eras") ?? "").split(",").filter(Boolean);
  const minPrice = Number(params.get("minPrice"));
  const maxPrice = Number(params.get("maxPrice"));
  const hasMin = params.get("minPrice") !== null && !Number.isNaN(minPrice);
  const hasMax = params.get("maxPrice") !== null && !Number.isNaN(maxPrice);
  // The series that touch any selected era — used to keep the DB sample era-relevant
  // (precise year trimming still happens in matchesEras below). De-duplicated across eras.
  const eraSets = [...new Set(eraFilter.flatMap((era) => ERA_SETS[era] ?? []))];

  const supabase = createClient(await cookies());

  // Build the eligible comparison pool. Exclude the always-dropped rarities in the
  // query, then sample a random window (the DB caps a select at ~1000 rows, so we
  // offset into the eligible set instead of always taking the first page), and
  // finally drop modern plain "Rare" in JS — release_date is free text the DB
  // filter can't compare by year. Quote the values so spaces ("No Rarity") parse.
  const excludeList = `(${DROP_RARITIES.map((rarity) => `"${rarity}"`).join(",")})`;
  // The count and sample queries must apply the SAME filters so the random window is
  // drawn from the filtered population. Series (`set`) and price go in the DB query;
  // era is applied in JS below (release_date is free text the DB can't compare by year).
  // Each query repeats the filter chain (as the file already does for the rarity exclude).
  let countQuery = supabase
    .from("cards")
    .select("card_id", { count: "exact", head: true })
    .not("rarity", "in", excludeList);
  if (seriesFilter.length) countQuery = countQuery.in("set", seriesFilter);
  if (eraSets.length) countQuery = countQuery.in("set", eraSets);
  if (hasMin) countQuery = countQuery.not("market_price", "is", null).gte("market_price", minPrice);
  if (hasMax) countQuery = countQuery.not("market_price", "is", null).lte("market_price", maxPrice);
  const { count, error: countError } = await countQuery;
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  // Fetch a random window and reduce it to eligible cards. Repeats the same filter chain
  // as the count query (the file already duplicates filters across count/rows).
  async function sampleEligible(offset: number): Promise<Card[]> {
    let rowsQuery = supabase
      .from("cards")
      .select("card_id, name, image_url, rarity, release_date")
      .not("rarity", "in", excludeList);
    if (seriesFilter.length) rowsQuery = rowsQuery.in("set", seriesFilter);
    if (eraSets.length) rowsQuery = rowsQuery.in("set", eraSets);
    if (hasMin) rowsQuery = rowsQuery.not("market_price", "is", null).gte("market_price", minPrice);
    if (hasMax) rowsQuery = rowsQuery.not("market_price", "is", null).lte("market_price", maxPrice);
    const { data: rows, error } = await rowsQuery.range(offset, offset + POOL_SAMPLE_SIZE - 1);
    if (error) throw new Error(error.message);
    // De-duplicate by card_id so a card can never be matched against itself: even if the
    // source data holds the same card under more than one row, it appears at most once in
    // the pool, and both pair-builders below select two distinct entries from it. The era
    // year-check trims boundary series the DB set-filter can't (release_date is free text).
    const byId = new Map<string, Card>();
    for (const row of (rows ?? []) as CardRow[]) {
      if (isEligible(row) && matchesEras(row.release_date, eraFilter) && !byId.has(row.card_id)) {
        byId.set(row.card_id, { card_id: row.card_id, name: row.name, image_url: row.image_url });
      }
    }
    return [...byId.values()];
  }

  // A restrictive filter can leave a single window with <2 eligible cards, so resample
  // with fresh offsets a few times before giving up. When the pool fits in one window
  // (maxOffset 0) every sample is identical, so one attempt is enough.
  const maxOffset = Math.max(0, (count ?? 0) - POOL_SAMPLE_SIZE);
  let cards: Card[] = [];
  try {
    for (let attempt = 0; attempt < SAMPLE_RETRIES && cards.length < 2; attempt++) {
      cards = await sampleEligible(Math.floor(Math.random() * (maxOffset + 1)));
      if (maxOffset === 0) break;
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  if (cards.length < 2) {
    return NextResponse.json({ error: "Not enough cards to compare" }, { status: 409 });
  }

  const { data: ranks, error: ranksError } = await supabase
    .from("card_ranks")
    .select("card_id, r, rd, mu")
    .eq("player_id", playerId);
  if (ranksError) {
    return NextResponse.json({ error: ranksError.message }, { status: 500 });
  }

  const rankByCardId = new Map(ranks?.map((rank) => [rank.card_id, rank]));
  const ratedCards: RatedCard[] = shuffle(
    cards.map((card) => ({
      ...card,
      ...(rankByCardId.get(card.card_id) ?? DEFAULT_RATING),
    })),
  );

  let pair: [RatedCard, RatedCard];
  if (winnerId) {
    // The held winner may fall outside the sampled eligible pool, so it won't be
    // in `ratedCards`. Fetch it directly in that case rather than 404-ing — the
    // fresh challenger still comes from the eligible pool below.
    let winner = ratedCards.find((card) => card.card_id === winnerId);
    if (!winner) {
      const { data: winnerCard, error: winnerError } = await supabase
        .from("cards")
        .select("card_id, name, image_url")
        .eq("card_id", winnerId)
        .single();
      if (winnerError || !winnerCard) {
        return NextResponse.json({ error: "winnerId not found" }, { status: 404 });
      }
      winner = { ...winnerCard, ...(rankByCardId.get(winnerId) ?? DEFAULT_RATING) };
    }

    // Which cards has the winner already been compared against (as either side)?
    const { data: history, error: historyError } = await supabase
      .from("comparisons")
      .select("winner_card, loser_card")
      .eq("player_id", playerId)
      .or(`winner_card.eq.${winnerId},loser_card.eq.${winnerId}`);
    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }
    const comparedOpponentIds = new Set(
      history?.map((row) => (row.winner_card === winnerId ? row.loser_card : row.winner_card)),
    );

    const fresh = supply_winner_with_fresh_card(winner, ratedCards, comparedOpponentIds);
    pair = [winner, fresh];
  } else {
    pair = information_rich_pair(ratedCards);
  }

  return NextResponse.json({
    cards: pair.map((card) => ({
      card_id: card.card_id,
      name: card.name,
      image_url: card.image_url,
    })),
  });
}
