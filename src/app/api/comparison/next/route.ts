import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_RATING } from "@/lib/glicko2";

type Card = { card_id: string; name: string; image_url: string };
// A card joined with this player's Glicko-2 rating for it (r, rd, mu).
type RatedCard = Card & { r: number; rd: number; mu: number };

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

/**
 * Given a fixed `winner` the player wants to keep on screen, choose the fresh
 * card to face it next. Prefers a card the winner has never been compared
 * against; among the candidates it favours a similar rating (`r`, a close
 * matchup) and then higher uncertainty (`rd`, more to learn).
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
  return [...choices].sort(
    (x, y) => Math.abs(x.r - winner.r) - Math.abs(y.r - winner.r) || y.rd - x.rd,
  )[0];
}

// Picks the next pair of cards for a player to compare.
// Query: ?playerId=...  and optionally &winnerId=... (Keep Winner mode: returns
// the winner plus one fresh challenger instead of a brand-new pair).
export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  const winnerId = request.nextUrl.searchParams.get("winnerId");
  // Optional, repeatable: ?rarity=Common&rarity=Rare — restrict the pool to cards
  // whose rarity is any of the selected values (OR semantics).
  const rarities = request.nextUrl.searchParams.getAll("rarity");
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const supabase = createClient(await cookies());

  let cardsQuery = supabase.from("cards").select("card_id, name, image_url");
  if (rarities.length > 0) {
    cardsQuery = cardsQuery.in("rarity", rarities);
  }
  const { data: cards, error: cardsError } = await cardsQuery;
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
  const ratedCards: RatedCard[] = shuffle(
    cards.map((card) => ({
      ...card,
      ...(rankByCardId.get(card.card_id) ?? DEFAULT_RATING),
    })),
  );

  let pair: [RatedCard, RatedCard];
  if (winnerId) {
    // The held winner may sit outside an active rarity filter, so it won't be in
    // the filtered pool. Fetch it directly in that case rather than 404-ing — the
    // fresh challenger still comes from the filtered pool below.
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
