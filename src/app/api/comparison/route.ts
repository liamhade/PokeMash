import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_RATING, updateRating } from "@/lib/glicko2";

// Records the outcome of a single head-to-head comparison: updates both
// cards' Glicko-2 ratings for this player and logs the comparison.
// Body: { playerId, winnerCardId, loserCardId, outcome?: "win" | "draw" }
// A "draw" (the user skipped) scores both cards 0.5; the two card ids land in
// winner_card/loser_card arbitrarily and the row is flagged is_draw.
export async function POST(request: NextRequest) {
  const { playerId, winnerCardId, loserCardId, outcome = "win" } = await request.json();
  if (!playerId || !winnerCardId || !loserCardId) {
    return NextResponse.json(
      { error: "playerId, winnerCardId and loserCardId are required" },
      { status: 400 },
    );
  }

  const supabase = createClient(await cookies());

  // Look up this player's existing ratings for the two cards involved; cards
  // they haven't rated yet start from DEFAULT_RATING.
  const { data: ranks, error: ranksError } = await supabase
    .from("card_ranks")
    .select("card_id, r, rd, mu")
    .eq("player_id", playerId)
    .in("card_id", [winnerCardId, loserCardId]);
  if (ranksError) {
    return NextResponse.json({ error: ranksError.message }, { status: 500 });
  }

  const rankByCardId = new Map(ranks?.map((rank) => [rank.card_id, rank]));
  const winnerRating = rankByCardId.get(winnerCardId) ?? DEFAULT_RATING;
  const loserRating = rankByCardId.get(loserCardId) ?? DEFAULT_RATING;

  const isDraw = outcome === "draw";
  // Both updates use each other's pre-update rating (not a sequential
  // winner-then-loser update), matching the Glicko-2 spec where all rating
  // changes for a period are computed from the same starting snapshot.
  const newWinnerRating = updateRating(winnerRating, loserRating, isDraw ? 0.5 : 1);
  const newLoserRating = updateRating(loserRating, winnerRating, isDraw ? 0.5 : 0);

  const { error: upsertError } = await supabase.from("card_ranks").upsert(
    [
      { player_id: playerId, card_id: winnerCardId, ...newWinnerRating, last_updated: new Date().toISOString() },
      { player_id: playerId, card_id: loserCardId, ...newLoserRating, last_updated: new Date().toISOString() },
    ],
    { onConflict: "player_id,card_id" },
  );
  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("comparisons").insert({
    player_id: playerId,
    winner_card: winnerCardId,
    loser_card: loserCardId,
    is_draw: isDraw,
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Whole-point rating changes, for the floating "+X / -Y" the Play screen shows
  // after a pick. winnerDelta is normally positive, loserDelta negative.
  return NextResponse.json({
    ok: true,
    winnerDelta: Math.round(newWinnerRating.r - winnerRating.r),
    loserDelta: Math.round(newLoserRating.r - loserRating.r),
  });
}
