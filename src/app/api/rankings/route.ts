import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Returns this player's ranked cards (highest rating first) plus progress info
// for the "compared x out of y" meter. Query: ?playerId=...
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const supabase = createClient(await cookies());

  const { data: ranks, error: ranksError } = await supabase
    .from("card_ranks")
    .select("r, cards(card_id, name, image_url)")
    .eq("player_id", playerId)
    .order("r", { ascending: false });
  if (ranksError) {
    return NextResponse.json({ error: ranksError.message }, { status: 500 });
  }

  // head: true fetches only the count, not 22k rows.
  const { count: totalCards, error: countError } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true });
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
