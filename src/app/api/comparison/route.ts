import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_RATING, updateRating } from "@/lib/glicko2";

export async function POST(request: NextRequest) {
  const { playerId, winnerCardId, loserCardId } = await request.json();
  if (!playerId || !winnerCardId || !loserCardId) {
    return NextResponse.json(
      { error: "playerId, winnerCardId and loserCardId are required" },
      { status: 400 },
    );
  }

  const supabase = createClient(await cookies());

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

  const newWinnerRating = updateRating(winnerRating, loserRating, 1);
  const newLoserRating = updateRating(loserRating, winnerRating, 0);

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
  });
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
