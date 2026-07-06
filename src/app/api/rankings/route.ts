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

// Returns this player's ranked cards (highest rating first) plus progress info
// for the "compared x out of y" meter. Query: ?playerId=... and optional filters
// (comma-separated ?series=..., ?minPrice=/?maxPrice=) that restrict both the
// ranked list and the progress denominator so the meter stays meaningful.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const playerId = params.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const series = (params.get("series") ?? "").split(",").filter(Boolean);
  const minPrice = Number(params.get("minPrice"));
  const maxPrice = Number(params.get("maxPrice"));
  const hasMin = params.get("minPrice") !== null && !Number.isNaN(minPrice);
  const hasMax = params.get("maxPrice") !== null && !Number.isNaN(maxPrice);

  const supabase = createClient(await cookies());

  // !inner so a filter on the embedded `cards` row drops ranks whose card doesn't
  // match, rather than returning them with a null relation.
  let ranksQuery = supabase
    .from("card_ranks")
    .select(
      "r, cards!inner(card_id, name, image_url, set, pack, release_date, collector_number, market_price)",
    )
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
  const { data: ranks, error: ranksError } = await ranksQuery;
  if (ranksError) {
    return NextResponse.json({ error: ranksError.message }, { status: 500 });
  }

  // head: true fetches only the count, not 22k rows. Filtered to match the list
  // so the "x out of y" meter stays meaningful under active filters.
  let countQuery = supabase.from("cards").select("*", { count: "exact", head: true });
  if (series.length > 0) {
    countQuery = countQuery.or(seriesOrFilter(series));
  }
  if (hasMin || hasMax) {
    countQuery = countQuery.not(PRICE_COLUMN, "is", null).neq(PRICE_COLUMN, PRICE_JUNK);
    if (hasMin) countQuery = countQuery.gte(PRICE_COLUMN, minPrice);
    if (hasMax) countQuery = countQuery.lte(PRICE_COLUMN, maxPrice);
  }
  const { count: totalCards, error: countError } = await countQuery;
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const rankings = (ranks ?? []).map((row, index) => ({
    rank: index + 1,
    r: row.r,
    // The embedded `cards` relation is returned as an array by the typed client.
    ...(Array.isArray(row.cards) ? row.cards[0] : row.cards),
  }));

  return NextResponse.json({
    rankings,
    comparedCount: rankings.length,
    totalCards: totalCards ?? 0,
  });
}
