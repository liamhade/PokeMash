import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// Reverses the most recent comparison for a player: restores both cards' ratings to the
// values the client held BEFORE the pick, and deletes that comparison's history row.
// Body: { playerId, winnerCardId, loserCardId, ratings: [{ card_id, r, rd, mu }, ...] }
//
// The client supplies the pre-pick ratings (it had them on screen), so the server doesn't
// try to invert Glicko-2 — it just writes the snapshot back. Pairs with the "Go back"
// button in Play, which only ever undoes a single matchup. The caller waits for the pick's
// own POST to settle before calling this, so the insert/upsert it reverses is already done.
export async function POST(request: NextRequest) {
  const { playerId, winnerCardId, loserCardId, ratings } = await request.json();
  if (!playerId || !winnerCardId || !loserCardId || !Array.isArray(ratings)) {
    return NextResponse.json(
      { error: "playerId, winnerCardId, loserCardId and ratings are required" },
      { status: 400 },
    );
  }

  const supabase = createClient(await cookies());

  // Delete only the newest matching comparison, not every prior meeting of these two
  // cards: find its id first (PostgREST delete can't order/limit on its own), then delete
  // by primary key. A missing row (e.g. the pick's POST never landed) is a no-op.
  //
  // NOTE: RLS currently grants the anon key INSERT/SELECT on `comparisons` but NOT DELETE,
  // so this delete silently affects zero rows in production today — the reverted ratings in
  // card_ranks are the authoritative undo, and a stale history row is harmless (ratings are
  // never recomputed from `comparisons`; it only feeds the "already compared" exclusion).
  // Add a DELETE policy scoped to player_id to make this take effect (tracked in TODO.md).
  const { data: latest, error: findError } = await supabase
    .from("comparisons")
    .select("comparison_id")
    .eq("player_id", playerId)
    .eq("winner_card", winnerCardId)
    .eq("loser_card", loserCardId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }
  if (latest) {
    const { error: deleteError } = await supabase
      .from("comparisons")
      .delete()
      .eq("comparison_id", latest.comparison_id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  // Restore each card's pre-pick rating. Only the two cards in the reverted matchup are
  // touched, so a stray entry can't rewrite an unrelated rating.
  const restore = ratings
    .filter((rating) => rating?.card_id === winnerCardId || rating?.card_id === loserCardId)
    .map((rating) => ({
      player_id: playerId,
      card_id: rating.card_id,
      r: rating.r,
      rd: rating.rd,
      mu: rating.mu,
      last_updated: new Date().toISOString(),
    }));
  if (restore.length > 0) {
    const { error: upsertError } = await supabase
      .from("card_ranks")
      .upsert(restore, { onConflict: "player_id,card_id" });
    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
