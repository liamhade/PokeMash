import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Returns this player's ranked cards (highest rating first) plus progress info
// for the "compared x out of y" meter. Query: ?playerId=...
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  // Optional, repeatable: ?rarity=Common&rarity=Rare — restrict both the ranked
  // list and the progress denominator to cards of the selected rarities.
  const rarities = request.nextUrl.searchParams.getAll("rarity");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const supabase = createClient(await cookies());

  // !inner so a rarity filter on the embedded `cards` row drops ranks whose card
  // doesn't match, rather than returning them with a null relation.
  let ranksQuery = supabase
    .from("card_ranks")
    .select(
      "r, cards!inner(card_id, name, image_url, rarity, set, pack, release_date, market_price)",
    )
    .eq("player_id", playerId)
    .order("r", { ascending: false });
  if (rarities.length > 0) {
    ranksQuery = ranksQuery.in("cards.rarity", rarities);
  }
  const { data: ranks, error: ranksError } = await ranksQuery;
  if (ranksError) {
    return NextResponse.json({ error: ranksError.message }, { status: 500 });
  }

  // head: true fetches only the count, not 22k rows. Filtered to match the list
  // so the "x out of y" meter stays meaningful under an active rarity filter.
  let countQuery = supabase.from("cards").select("*", { count: "exact", head: true });
  if (rarities.length > 0) {
    countQuery = countQuery.in("rarity", rarities);
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
