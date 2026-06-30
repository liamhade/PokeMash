import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { DEFAULT_RATING } from "@/lib/glicko2";

type Card = { card_id: string; name: string; image_url: string };
// A card joined with this player's Glicko-2 rating for it (r, rd, mu).
type RatedCard = Card & { r: number; rd: number; mu: number };
// The extra columns we need to decide pool eligibility (not sent to the client).
type CardRow = Card & { rarity: string; release_date: string | null };

// --- Comparison pool eligibility -------------------------------------------
// Comparing Common/Uncommon cards is boring, and "interesting" differs by era.
// These rules decide which cards may appear on the Play screen.
//
// NOTE: this logic is mirrored in supabase/migrations/20260630_comparison_pool.sql.
// For now it lives here (the app's read-only key can't create that DB function);
// move it into the database when someone with DB access can apply the migration.

// Always excluded: boring base rarities + the modern ex card ("Double Rare",
// which is framed art, not full art). Excluded server-side via a `not in` filter.
const DROP_RARITIES = ["Common", "Uncommon", "No Rarity", "Double Rare"];

// Plain "Rare" is era-dependent: a real chase card in VINTAGE sets, but in the
// modern (Scarlet & Violet, 2023+) ladder it's a non-full-art black-star rare.
// So keep "Rare" only for sets released before this year.
const VINTAGE_CUTOFF_YEAR = 2023;

// Cards to pull per request — a random window into the eligible pool so repeat
// visits don't always surface the same cards.
const POOL_SAMPLE_SIZE = 1000;

// release_date is free text like " May 22, 2026"; pull the first 4-digit year.
function releaseYear(releaseDate: string | null): number {
  const match = (releaseDate ?? "").match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

// The era-dependent rule a SQL `not in` filter can't express: drop plain "Rare"
// from modern sets. (The always-dropped rarities are already excluded in the query.)
function isEligible(row: CardRow): boolean {
  if (row.rarity === "Rare") return releaseYear(row.release_date) < VINTAGE_CUTOFF_YEAR;
  return true;
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
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }

  const supabase = createClient(await cookies());

  // Build the eligible comparison pool. Exclude the always-dropped rarities in the
  // query, then sample a random window (the DB caps a select at ~1000 rows, so we
  // offset into the eligible set instead of always taking the first page), and
  // finally drop modern plain "Rare" in JS — release_date is free text the DB
  // filter can't compare by year. Quote the values so spaces ("No Rarity") parse.
  const excludeList = `(${DROP_RARITIES.map((rarity) => `"${rarity}"`).join(",")})`;
  const { count, error: countError } = await supabase
    .from("cards")
    .select("card_id", { count: "exact", head: true })
    .not("rarity", "in", excludeList);
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  const offset = Math.max(0, Math.floor(Math.random() * ((count ?? 0) - POOL_SAMPLE_SIZE)));
  const { data: rows, error: cardsError } = await supabase
    .from("cards")
    .select("card_id, name, image_url, rarity, release_date")
    .not("rarity", "in", excludeList)
    .range(offset, offset + POOL_SAMPLE_SIZE - 1);
  if (cardsError) {
    return NextResponse.json({ error: cardsError.message }, { status: 500 });
  }
  const cards: Card[] = ((rows ?? []) as CardRow[])
    .filter(isEligible)
    .map(({ card_id, name, image_url }) => ({ card_id, name, image_url }));
  if (cards.length < 2) {
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
    // The held winner may fall outside the sampled eligible pool, so it won't be
    // in `ratedCards`. Fetch it directly in that case rather than 404-ing — the
    // fresh challenger still comes from the eligible pool below.
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
