import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// "Legendary Collection" is a curated pseudo-series: in the data it's a `pack` inside
// the `Other` set, not a `set` of its own. It gets its own filter option, carved out of
// "Other" so the two stay disjoint. These values mirror /api/comparison/next.
const LEGENDARY_COLLECTION = "Legendary Collection";
const LEGENDARY_COLLECTION_PACK = "Legendary Collection (LC)";

// Price bounds range over market_price — the recent-sales value (see the discussion in
// /api/comparison/next). 0 is its "no sales data" sentinel, treated as no price.
const PRICE_COLUMN = "market_price";
const PRICE_JUNK = 0;

// The selected series as one PostgREST `or` condition: plain series match on `set`,
// Legendary Collection matches its pack, and "Other" is the Other set minus that pack.
// A single string so the SAME disjunction filters both the top-level cards count and
// the embedded cards rows of the ranks query (via referencedTable).
function seriesOrFilter(series: string[]): string {
  const plain = series.filter((s) => s !== LEGENDARY_COLLECTION && s !== "Other");
  const parts: string[] = [];
  if (plain.length > 0) parts.push(`set.in.(${plain.map((s) => `"${s}"`).join(",")})`);
  if (series.includes(LEGENDARY_COLLECTION)) {
    parts.push(`pack.eq."${LEGENDARY_COLLECTION_PACK}"`);
  }
  if (series.includes("Other")) {
    parts.push(`and(set.eq.Other,pack.neq."${LEGENDARY_COLLECTION_PACK}")`);
  }
  return parts.join(",");
}

// Universal scope: a community-favorites leaderboard, not an exhaustive table.
const UNIVERSAL_LIMIT = 100;
// Personal scope is paginated (?page=0,1,…): a heavy player can rate thousands of
// cards, and rendering them all at once bloats the DOM. The client appends pages
// behind a "Load more" button. The exact rank count still drives the progress meter.
const PERSONAL_PAGE_SIZE = 100;
// PostgREST caps a single select at ~1000 rows, so the all-players ranks read pages.
const RANKS_PAGE_SIZE = 1000;
// Card ids resolved per details query — keeps the .in() URL comfortably short.
const DETAILS_CHUNK = 100;

// The universal score is a Bayesian (shrinkage) average, not a plain mean: a card's
// raters' average is blended with the global mean, weighted by how many raters it has.
// This keeps single enthusiastic votes from topping "community favorites" over cards
// many players broadly love — the same method as IMDB's Top 250. Raise the constant to
// demand more raters before a card's own average dominates; lower it toward a plain mean.
//   score = (v / (v + m)) * cardMean + (m / (v + m)) * globalMean
//   v = the card's rater count, m = BAYESIAN_SMOOTHING, globalMean = mean over all rows
const BAYESIAN_SMOOTHING = 5;

// The card columns the rankings list displays (shared by both scopes).
const CARD_COLUMNS =
  "card_id, name, image_url, set, pack, release_date, collector_number, market_price";

// Returns ranked cards, highest rating first.
// Query: ?playerId=... for the player's own list (plus progress info for the
// "compared x out of y" meter), or ?scope=universal for the community list —
// every player's rating for a card averaged into one score. Optional filters
// (comma-separated ?series=..., ?minPrice=/?maxPrice=) restrict both scopes.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const playerId = params.get("playerId");
  const universal = params.get("scope") === "universal";

  const series = (params.get("series") ?? "").split(",").filter(Boolean);
  const minPrice = Number(params.get("minPrice"));
  const maxPrice = Number(params.get("maxPrice"));
  const hasMin = params.get("minPrice") !== null && !Number.isNaN(minPrice);
  const hasMax = params.get("maxPrice") !== null && !Number.isNaN(maxPrice);

  const supabase = createClient(await cookies());

  // --- Universal scope: average every player's rating per card ---------------
  if (universal) {
    // Every rating row from every player, paged. Ordered by (player_id, card_id) —
    // the table's composite key — so consecutive pages can't overlap or skip rows.
    const all: { card_id: string; r: number }[] = [];
    for (let from = 0; ; from += RANKS_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("card_ranks")
        .select("card_id, r")
        .order("player_id")
        .order("card_id")
        .range(from, from + RANKS_PAGE_SIZE - 1);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      all.push(...(data ?? []));
      if (!data || data.length < RANKS_PAGE_SIZE) break;
    }

    // Sum each card's ratings and rater count, and the global mean across every row
    // (the prior the Bayesian average shrinks sparsely-rated cards toward).
    const agg = new Map<string, { sum: number; n: number }>();
    let globalSum = 0;
    for (const row of all) {
      const entry = agg.get(row.card_id) ?? { sum: 0, n: 0 };
      entry.sum += row.r;
      entry.n += 1;
      agg.set(row.card_id, entry);
      globalSum += row.r;
    }
    const globalMean = all.length > 0 ? globalSum / all.length : 0;

    // Bayesian score per card (see BAYESIAN_SMOOTHING). `r` is the shrunk score used
    // for ranking; `raters` is surfaced so the UI can show how many players weighed in.
    // Ties break toward the more-rated card.
    const ordered = [...agg.entries()]
      .map(([card_id, { sum, n }]) => {
        const cardMean = sum / n;
        const weight = n / (n + BAYESIAN_SMOOTHING);
        return { card_id, r: weight * cardMean + (1 - weight) * globalMean, raters: n };
      })
      .sort((a, b) => b.r - a.r || b.raters - a.raters);

    // Resolve card details for the best-scored ids in chunks, applying the price/
    // series filters in each query, and stop as soon as the leaderboard is full —
    // filtered-out cards simply don't come back from the details query.
    const rankings: Record<string, unknown>[] = [];
    for (let i = 0; i < ordered.length && rankings.length < UNIVERSAL_LIMIT; i += DETAILS_CHUNK) {
      const chunk = ordered.slice(i, i + DETAILS_CHUNK);
      let detailsQuery = supabase
        .from("cards")
        .select(CARD_COLUMNS)
        .in(
          "card_id",
          chunk.map((entry) => entry.card_id),
        );
      if (series.length > 0) detailsQuery = detailsQuery.or(seriesOrFilter(series));
      if (hasMin || hasMax) {
        detailsQuery = detailsQuery.not(PRICE_COLUMN, "is", null).neq(PRICE_COLUMN, PRICE_JUNK);
        if (hasMin) detailsQuery = detailsQuery.gte(PRICE_COLUMN, minPrice);
        if (hasMax) detailsQuery = detailsQuery.lte(PRICE_COLUMN, maxPrice);
      }
      const { data: details, error } = await detailsQuery;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      const detailById = new Map((details ?? []).map((row) => [row.card_id, row]));
      for (const entry of chunk) {
        const card = detailById.get(entry.card_id);
        if (!card || rankings.length >= UNIVERSAL_LIMIT) continue;
        rankings.push({
          rank: rankings.length + 1,
          r: Math.round(entry.r),
          raters: entry.raters,
          ...card,
        });
      }
    }

    // No comparedCount: the progress meter is personal, so the client doesn't
    // render it for the universal list.
    return NextResponse.json({ rankings });
  }

  // --- Personal scope ---------------------------------------------------------
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  // Which page of the player's ranked cards to return (100 per page, best first).
  const page = Math.max(0, Math.floor(Number(params.get("page")) || 0));
  const from = page * PERSONAL_PAGE_SIZE;

  // !inner so a filter on the embedded `cards` row drops ranks whose card doesn't
  // match, rather than returning them with a null relation. count: "exact" returns
  // the total matching ranks (ignoring the range) so the meter and "load more" know
  // the real total, not just this page's size.
  let ranksQuery = supabase
    .from("card_ranks")
    .select(`r, cards!inner(${CARD_COLUMNS})`, { count: "exact" })
    .eq("player_id", playerId)
    .order("r", { ascending: false });
  if (series.length > 0) {
    ranksQuery = ranksQuery.or(seriesOrFilter(series), { referencedTable: "cards" });
  }
  if (hasMin || hasMax) {
    ranksQuery = ranksQuery
      .not(`cards.${PRICE_COLUMN}`, "is", null)
      .neq(`cards.${PRICE_COLUMN}`, PRICE_JUNK);
    if (hasMin) ranksQuery = ranksQuery.gte(`cards.${PRICE_COLUMN}`, minPrice);
    if (hasMax) ranksQuery = ranksQuery.lte(`cards.${PRICE_COLUMN}`, maxPrice);
  }
  ranksQuery = ranksQuery.range(from, from + PERSONAL_PAGE_SIZE - 1);
  const { data: ranks, count: comparedCount, error: ranksError } = await ranksQuery;
  if (ranksError) {
    return NextResponse.json({ error: ranksError.message }, { status: 500 });
  }

  const rankings = (ranks ?? []).map((row, index) => ({
    // Rank is absolute across pages, so offset by where this page starts.
    rank: from + index + 1,
    r: row.r,
    // The embedded `cards` relation is returned as an array by the typed client.
    ...(Array.isArray(row.cards) ? row.cards[0] : row.cards),
  }));

  return NextResponse.json({
    rankings,
    comparedCount: comparedCount ?? 0,
  });
}
