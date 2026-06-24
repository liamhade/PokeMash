import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_RATING } from "@/lib/glicko2";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const supabase = createClient(await cookies());

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("card_id, name, image_url");
  if (cardsError) {
    return NextResponse.json({ error: cardsError.message }, { status: 500 });
  }
  if (!cards || cards.length < 2) {
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
  const ratedCards = cards.map((card) => ({
    ...card,
    ...(rankByCardId.get(card.card_id) ?? DEFAULT_RATING),
  }));

  // Pick the card we have the least information about, then its closest peer by
  // rating so the comparison is maximally informative.
  const cardA = [...ratedCards].sort((x, y) => y.rd - x.rd)[0];
  const cardB = ratedCards
    .filter((card) => card.card_id !== cardA.card_id)
    .sort((x, y) => Math.abs(x.r - cardA.r) - Math.abs(y.r - cardA.r))[0];

  return NextResponse.json({
    cards: [
      { card_id: cardA.card_id, name: cardA.name, image_url: cardA.image_url },
      { card_id: cardB.card_id, name: cardB.name, image_url: cardB.image_url },
    ],
  });
}
