import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { withStorageArt } from "@/lib/cardArt";
import { DEFAULT_RATING } from "@/lib/glicko2";
import { LEGENDARY_COLLECTION, matchesSeries } from "@/lib/comparisonPool";

// set/pack/release_date, market_price, and the TCGplayer product id ride along
// to the client for the card-info flip on Play.
type Card = {
  card_id: string;
  name: string;
  image_url: string;
  set: string | null;
  pack: string | null;
  release_date: string | null;
  market_price: number | null;
  tcgplayer_product_id: number | null;
};
// A card joined with this player's Glicko-2 rating for it (r, rd, mu).
type RatedCard = Card & { r: number; rd: number; mu: number };
// The extra column we read per row: art_url is folded into image_url before the
// card leaves this route (see lib/cardArt).
type CardRow = Card & { art_url: string | null };

// Pool eligibility is the stamped `cards.eligible` column (rules in
// lib/comparisonPool, applied by scripts/stamp-eligibility.ts); this route just
// filters on it. Only the series matcher is still needed here in JS.

// Cards to pull per request — a random window into the eligible pool so repeat
// visits don't always surface the same cards.
const POOL_SAMPLE_SIZE = 1000;

// A restrictive filter can leave a given random window with fewer than two eligible
// cards. Resample with a fresh offset up to this many times before reporting an empty
// pool (no effect when the pool already fits in one window).
const SAMPLE_RETRIES = 4;

// The price filter ranges over `market_price` — the value derived from recent actual
// sales (the closest thing to a "last sold" price). `lowest_price`/`highest_price` are
// just the cheapest/priciest current LISTINGS (asking prices): in 99% of rows
// lowest <= market <= highest, so those bracket the market value. PRICE_JUNK is the 0
// sentinel market_price uses for "no sales data" (e.g. Mewtwo Star), treated as no price.
const PRICE_COLUMN = "market_price";
const PRICE_JUNK = 0;

// --- User-controlled filters (price / era / series) ------------------------
// Optional filters the player sets via the Filter modal, layered on top of the
// always-on rarity rules above. Series and price are pushed into the DB query;
// era is applied in JS here because release_date is free text the DB can't
// compare by year.

// Era buckets by release year. These are TCG eras, not literal 10-year decades:
// vintage = WOTC→Platinum/HGSS, middle = Black & White→Sun & Moon, modern =
// Sword & Shield onward. Boundaries align with the rough year a new base era began.
const ERA_YEAR_RANGES: Record<string, [number, number]> = {
  vintage: [0, 2007], // through the EX era (ends 2007)
  middle: [2008, 2016], // Diamond & Pearl through XY (ends 2016)
  modern: [2017, 9999], // Sun & Moon onward
};

// Which `set` (series) values to draw on for each era (boundaries: vintage ≤2007,
// middle 2008–2016, modern 2017+). The random sample window is contiguous, so an era
// filter applied only in JS would often miss the era's rows entirely; pre-filtering the
// DB query to these series keeps the window era-relevant, and matchesEras() then trims
// to the exact release year. A series is listed under an era only where it has
// SUBSTANTIAL volume — boundary series that merely graze an era (XY's 2017–18 tail, Sun
// & Moon's 2016 set) are left off it so they don't dilute the window with rows the
// year-check discards. The long, continuously-printed catch-alls (Promos, Other) really
// do span, so they stay in every era. Regenerate when the catalog gains new series.
const ERA_SETS: Record<string, string[]> = {
  vintage: ["Classic", "Promos", "Neo", "Gym", "Other", "E-Card", "EX", "POP"],
  middle: ["Promos", "Other", "POP", "Diamond & Pearl", "Platinum", "HeartGold & SoulSilver", "Black & White", "XY"],
  modern: ["Promos", "Other", "Sun & Moon", "Sword & Shield", "Scarlet & Violet", "Mega Evolution", "Collections"],
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
// Nudged down over time (0.30 -> 0.27 -> 0.24) to favor close-rating matchups more
// often — less wildcard exploration, a bit more informative exploitation each pass.
const EXPLORE_EPSILON = 0.24;

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

/**
 * Batched variant for the client's preload queue: up to `n` distinct challengers, each
 * drawn by the same explore/exploit policy. Picked cards are removed from the pool
 * between draws so one batch can't contain duplicates; returns fewer than `n` (possibly
 * zero) when the pool runs dry. The expensive work in this route (count/ranks/history
 * reads, the window sample) is per-REQUEST, so extra draws here are nearly free.
 */
function supply_winner_with_fresh_cards(
  winner: RatedCard,
  candidates: RatedCard[],
  comparedOpponentIds: Set<string>,
  n: number,
): RatedCard[] {
  const fresh: RatedCard[] = [];
  let pool = candidates;
  for (let i = 0; i < n; i++) {
    if (!pool.some((card) => card.card_id !== winner.card_id)) break;
    const pick = supply_winner_with_fresh_card(winner, pool, comparedOpponentIds);
    fresh.push(pick);
    pool = pool.filter((card) => card.card_id !== pick.card_id);
  }
  return fresh;
}

// Cap on `count` so a buggy or hostile client can't ask for the whole pool.
const FRESH_COUNT_MAX = 5;

// Picks the next cards for a player to compare.
// Query: ?playerId=...  and optionally &winnerId=... (Keep Winner mode: returns
// the winner plus `count` (default 1) fresh challengers instead of a brand-new pair).
// Without winnerId, returns `count` (default 1) PAIRS, flattened consecutively
// ([a1, b1, a2, b2, …]) with every card distinct — the client queues them, and a
// queued pair sharing a card with the board can't take the overlap animation path.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const playerId = params.get("playerId");
  const winnerId = params.get("winnerId");
  // Optional: card ids (comma-separated) to exclude from the pool even if not yet in
  // history. The client uses this to PRELOAD while the current pair is still up —
  // passing the on-board cards plus everything already queued, so none of them is
  // served right back (the same guarantee the post-pick history normally provides
  // once results are saved).
  const excludeIds = (params.get("excludeId") ?? "").split(",").filter(Boolean);
  // How many challengers (Keep Winner) or pairs (fresh mode) to return — the client
  // batches its preload queue into one request; capped so `count` can't dump the pool.
  const freshCount = Math.min(FRESH_COUNT_MAX, Math.max(1, Number(params.get("count")) || 1));
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  // Optional Filter-modal selections. Multi-value filters arrive comma-separated;
  // prices are parsed to numbers (ignored if blank/NaN). Empty = filter not applied.
  const seriesFilter = (params.get("series") ?? "").split(",").filter(Boolean);
  const eraFilter = (params.get("eras") ?? "").split(",").filter(Boolean);
  // For DB windowing each series maps to its underlying `set` (Legendary Collection lives
  // in the Other set); matchesSeries() then refines precisely in JS. De-duplicated.
  const seriesWindowSets = [
    ...new Set(seriesFilter.map((name) => (name === LEGENDARY_COLLECTION ? "Other" : name))),
  ];
  const minPrice = Number(params.get("minPrice"));
  const maxPrice = Number(params.get("maxPrice"));
  const hasMin = params.get("minPrice") !== null && !Number.isNaN(minPrice);
  const hasMax = params.get("maxPrice") !== null && !Number.isNaN(maxPrice);
  // Minimum ELO: filters on THIS player's rating for each card. Ratings live per-player
  // in card_ranks (not on the cards row), so this can't go in the DB query — it's applied
  // in JS inside sampleEligible, with unrated cards counting as the DEFAULT_RATING.
  const minElo = Number(params.get("minElo"));
  const hasMinElo = params.get("minElo") !== null && !Number.isNaN(minElo);
  // The series that touch any selected era — used to keep the DB sample era-relevant
  // (precise year trimming still happens in matchesEras below). De-duplicated across eras.
  const eraSets = [...new Set(eraFilter.flatMap((era) => ERA_SETS[era] ?? []))];

  const supabase = createClient(await cookies());

  // Build the comparison pool from the stamped eligible set, sampling a random
  // window (the DB caps a select at ~1000 rows, so we offset into the eligible set
  // instead of always taking the first page).
  // The count and sample queries must apply the SAME filters so the random window is
  // drawn from the filtered population. Series (`set`) and price go in the DB query;
  // era is applied in JS below (release_date is free text the DB can't compare by year).
  let countQuery = supabase
    .from("cards")
    .select("card_id", { count: "exact", head: true })
    .eq("eligible", true);
  if (seriesWindowSets.length) countQuery = countQuery.in("set", seriesWindowSets);
  if (eraSets.length) countQuery = countQuery.in("set", eraSets);
  if (hasMin || hasMax) {
    countQuery = countQuery.not(PRICE_COLUMN, "is", null).neq(PRICE_COLUMN, PRICE_JUNK);
    if (hasMin) countQuery = countQuery.gte(PRICE_COLUMN, minPrice);
    if (hasMax) countQuery = countQuery.lte(PRICE_COLUMN, maxPrice);
  }
  // This player's ratings, in pages: PostgREST caps a single select at ~1000 rows, and a
  // long-time player can hold more ratings than that. Truncating here would silently treat
  // rated cards as unrated (DEFAULT_RATING), skewing pairing and disagreeing with the
  // client's dial math. Ordered so consecutive pages can't overlap or skip rows.
  const RANKS_PAGE_SIZE = 1000;
  async function fetchAllRanks() {
    const all: { card_id: string; r: number; rd: number; mu: number }[] = [];
    for (let from = 0; ; from += RANKS_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("card_ranks")
        .select("card_id, r, rd, mu")
        .eq("player_id", playerId)
        .order("card_id")
        .range(from, from + RANKS_PAGE_SIZE - 1);
      if (error) throw new Error(error.message);
      all.push(...(data ?? []));
      if (!data || data.length < RANKS_PAGE_SIZE) return all;
    }
  }

  // In Keep Winner mode: which cards has the winner already been compared against (as
  // either side)? Only needs playerId/winnerId, so it can run before sampling.
  const historyQuery = winnerId
    ? supabase
        .from("comparisons")
        .select("winner_card, loser_card")
        .eq("player_id", playerId)
        .or(`winner_card.eq.${winnerId},loser_card.eq.${winnerId}`)
    : null;

  // The count, the player's ratings, and the winner's history are independent reads, so
  // they go out together. Only the window sample (needs the count) waits — the pick
  // path's sequential round trips drop from four to two.
  let count: number | null;
  let ranks: Awaited<ReturnType<typeof fetchAllRanks>>;
  let history: { winner_card: string; loser_card: string }[] | null;
  try {
    const [countResult, ranksResult, historyResult] = await Promise.all([
      countQuery,
      fetchAllRanks(),
      historyQuery,
    ]);
    if (countResult.error) throw new Error(countResult.error.message);
    if (historyResult?.error) throw new Error(historyResult.error.message);
    count = countResult.count;
    ranks = ranksResult;
    history = historyResult?.data ?? null;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  // Built before sampling because the ELO filter below needs each row's rating.
  const rankByCardId = new Map(ranks.map((rank) => [rank.card_id, rank]));

  // Fetch a random window of eligible cards. Repeats the same filter chain as the
  // count query so the window is drawn from the counted population.
  async function sampleEligible(offset: number): Promise<Card[]> {
    let rowsQuery = supabase
      .from("cards")
      .select("card_id, name, image_url, art_url, set, pack, release_date, market_price, tcgplayer_product_id")
      .eq("eligible", true);
    if (seriesWindowSets.length) rowsQuery = rowsQuery.in("set", seriesWindowSets);
    if (eraSets.length) rowsQuery = rowsQuery.in("set", eraSets);
    if (hasMin || hasMax) {
      rowsQuery = rowsQuery.not(PRICE_COLUMN, "is", null).neq(PRICE_COLUMN, PRICE_JUNK);
      if (hasMin) rowsQuery = rowsQuery.gte(PRICE_COLUMN, minPrice);
      if (hasMax) rowsQuery = rowsQuery.lte(PRICE_COLUMN, maxPrice);
    }
    const { data: rows, error } = await rowsQuery.range(offset, offset + POOL_SAMPLE_SIZE - 1);
    if (error) throw new Error(error.message);
    // De-duplicate by card_id so a card can never be matched against itself: even if the
    // source data holds the same card under more than one row, it appears at most once in
    // the pool, and both pair-builders below select two distinct entries from it. The era
    // year-check trims boundary series the DB set-filter can't (release_date is free text).
    const byId = new Map<string, Card>();
    for (const row of (rows ?? []) as CardRow[]) {
      if (
        matchesSeries(row, seriesFilter) &&
        matchesEras(row.release_date, eraFilter) &&
        (!hasMinElo || (rankByCardId.get(row.card_id) ?? DEFAULT_RATING).r >= minElo) &&
        !byId.has(row.card_id)
      ) {
        byId.set(row.card_id, {
          card_id: row.card_id,
          name: row.name,
          image_url: row.art_url ?? row.image_url,
          set: row.set,
          pack: row.pack,
          release_date: row.release_date,
          market_price: row.market_price,
          tcgplayer_product_id: row.tcgplayer_product_id,
        });
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

  const ratedCards: RatedCard[] = shuffle(
    cards.map((card) => ({
      ...card,
      ...(rankByCardId.get(card.card_id) ?? DEFAULT_RATING),
    })),
  );

  let chosen: RatedCard[];
  if (winnerId) {
    // The held winner may fall outside the sampled eligible pool, so it won't be
    // in `ratedCards`. Fetch it directly in that case rather than 404-ing — the
    // fresh challenger still comes from the eligible pool below.
    let winner = ratedCards.find((card) => card.card_id === winnerId);
    if (!winner) {
      const { data: winnerCard, error: winnerError } = await supabase
        .from("cards")
        .select("card_id, name, image_url, art_url, set, pack, release_date, market_price, tcgplayer_product_id")
        .eq("card_id", winnerId)
        .single();
      if (winnerError || !winnerCard) {
        return NextResponse.json({ error: "winnerId not found" }, { status: 404 });
      }
      winner = {
        ...withStorageArt(winnerCard),
        ...(rankByCardId.get(winnerId) ?? DEFAULT_RATING),
      };
    }

    // Which cards has the winner already been compared against (as either side)?
    // (Fetched up top, in parallel with the count and ratings.)
    const comparedOpponentIds = new Set(
      history?.map((row) => (row.winner_card === winnerId ? row.loser_card : row.winner_card)),
    );
    for (const id of excludeIds) comparedOpponentIds.add(id);

    const fresh = supply_winner_with_fresh_cards(winner, ratedCards, comparedOpponentIds, freshCount);
    chosen = [winner, ...fresh];
  } else {
    const excluded = new Set(excludeIds);
    let pool = ratedCards.filter((card) => !excluded.has(card.card_id));
    // A restrictive filter can leave too few cards once the board/queue is excluded;
    // serve from the full pool instead of nothing (the client tolerates an overlapping
    // pair via its slower sequential swap path).
    if (pool.length < 2) pool = ratedCards;
    chosen = [];
    for (let i = 0; i < freshCount && pool.length >= 2; i++) {
      const pair = information_rich_pair(pool);
      chosen.push(...pair);
      pool = pool.filter((card) => card !== pair[0] && card !== pair[1]);
    }
  }

  return NextResponse.json({
    // r/rd/mu are included so the client can compute the Glicko-2 +X/-Y for a pick
    // instantly (same inputs the POST uses), instead of waiting on the write to return them.
    cards: chosen.map((card) => ({
      card_id: card.card_id,
      name: card.name,
      image_url: card.image_url,
      set: card.set,
      pack: card.pack,
      release_date: card.release_date,
      market_price: card.market_price,
      tcgplayer_product_id: card.tcgplayer_product_id,
      r: card.r,
      rd: card.rd,
      mu: card.mu,
    })),
  });
}
