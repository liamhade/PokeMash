"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerId } from "@/lib/playerId";
import FilterModal, { EMPTY_FILTERS, type Filters } from "@/components/FilterModal";
import PanelLeft from "@/components/PanelLeft";
import PanelRight from "@/components/PanelRight";
import ComparisonArea, {
  type Card,
  type Position,
  type FloatDelta,
} from "./ComparisonArea";

function positionsFor(cards: Card[], position: Position): Record<string, Position> {
  return Object.fromEntries(cards.map((card) => [card.card_id, position]));
}

// Land the number in the white margin on the card's OUTER side (away from the other
// card) so it's readable off the card art, with a random vertical spread. dx clears
// the card's ~130px half-width; dy stays within its height so it reads alongside it.
function randomFloat(delta: number, side: "left" | "right"): FloatDelta {
  const outward = side === "left" ? -1 : 1;
  return {
    delta,
    dx: outward * (188 + Math.random() * 80), // 188–268px to the outer side (min +25%)
    dy: (Math.random() - 0.5) * 200, // ±100px vertical spread
    key: Math.random(),
  };
}

// Persisted on-screen pair, so leaving Play (e.g. for Rankings) and coming back restores
// the same matchup instead of reshuffling the board. We keep it in sessionStorage, not
// localStorage: this is a transient, this-tab concern, not long-lived player progress.
const COMPARISON_STORAGE_KEY = "pokemash:comparison";

type SavedComparison = { cards: Card[]; streak: number; streakCardId: string | null };

function readSavedComparison(): SavedComparison | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(COMPARISON_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedComparison;
    // Only restore a complete pair; ignore malformed/partial data.
    return saved.cards?.length === 2 ? saved : null;
  } catch {
    return null;
  }
}

function writeSavedComparison(saved: SavedComparison) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Storage can throw (private mode, quota exceeded); persistence is best-effort.
  }
}

// Serialize the active filters into a query-string fragment for /api/comparison/next.
// Returns "" when nothing is set (so the URL stays clean), otherwise a leading-"&" chunk.
function buildFilterQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.series.length) params.set("series", filters.series.join(","));
  if (filters.eras.length) params.set("eras", filters.eras.join(","));
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  const query = params.toString();
  return query ? `&${query}` : "";
}

export default function ComparisonScreen() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [pos, setPos] = useState<Record<string, Position>>({});
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [keepWinner, setKeepWinner] = useState(true);
  // True only when both cards are settled at center and a pick is allowed. Guards
  // against picking mid-animation or double-submitting a comparison.
  const [ready, setReady] = useState(false);

  // Consecutive wins of the currently-held card, for the streak flame. streakCardId
  // is which card the streak belongs to; it resets when a different card wins.
  const [streak, setStreak] = useState(0);
  const [streakCardId, setStreakCardId] = useState<string | null>(null);

  // Active pool filters (price/era/series) and whether the Filter modal is open. True
  // poolEmpty means the current filters matched fewer than two cards.
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [poolEmpty, setPoolEmpty] = useState(false);
  // Read filters inside async fetch callbacks without making them depend on filters.
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  // Rating-change numbers currently floating over cards, keyed by card id.
  const [floats, setFloats] = useState<Record<string, FloatDelta>>({});
  // Show a "+X / -Y" beside a card. delta 0 isn't worth animating.
  function showFloat(cardId: string, delta: number, side: "left" | "right") {
    if (!delta) return;
    setFloats((prev) => ({ ...prev, [cardId]: randomFloat(delta, side) }));
  }
  function clearFloat(cardId: string) {
    setFloats((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  }

  // Read the toggle inside async callbacks without making them depend on it.
  const keepWinnerRef = useRef(keepWinner);
  useEffect(() => {
    keepWinnerRef.current = keepWinner;
  }, [keepWinner]);

  const loadNextPair = useCallback(async () => {
    const playerId = getPlayerId();
    const res = await fetch(
      `/api/comparison/next?playerId=${playerId}${buildFilterQuery(filtersRef.current)}`,
    );
    const { cards: next } = (await res.json()) as { cards?: Card[] };

    // Clear the outgoing cards first so the new pair mounts below the screen
    // without the old (now off-screen-above) cards re-rendering at center.
    setPickedId(null);
    setHoveredId(null);
    setCards(null);
    setPos({});
    setFloats({}); // a fresh pair carries no rating floats from the previous round
    // Filters can match fewer than two cards; show a message instead of crashing.
    if (!next || next.length < 2) {
      setPoolEmpty(true);
      return;
    }
    setPoolEmpty(false);
    requestAnimationFrame(() => {
      setCards(next);
      setPos(positionsFor(next, "below"));
      // Let the blank screen render for a beat before the cards slide in.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPos(positionsFor(next, "center"));
          setTimeout(() => setReady(true), 500);
        }),
      );
    });
  }, []);

  // On mount, restore the previously-saved pair (settled at center, immediately
  // pickable) so navigating away and back doesn't reshuffle the board. With nothing
  // saved, fetch the first pair instead. Both paths set state on mount, which the lint
  // rule flags but is the intent here (the fetch path is async, so no sync cascade).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = readSavedComparison();
    if (saved) {
      setCards(saved.cards);
      setPos(positionsFor(saved.cards, "center"));
      setStreak(saved.streak);
      setStreakCardId(saved.streakCardId);
      setReady(true);
      return;
    }
    loadNextPair();
  }, [loadNextPair]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist the current settled pair (and its streak) whenever it changes. We only save
  // when `ready` — both cards are at center — so transient null/mid-animation states
  // aren't stored and later restored as a half-rendered board.
  useEffect(() => {
    if (cards && ready) {
      writeSavedComparison({ cards, streak, streakCardId });
    }
  }, [cards, ready, streak, streakCardId]);

  // Keep Winner mode: hold the winner at center, slide the loser out, and slide a
  // freshly chosen challenger up into the loser's now-empty slot.
  async function swapLoserForFresh(winner: Card, loser: Card, playerId: string) {
    const res = await fetch(
      `/api/comparison/next?playerId=${playerId}&winnerId=${winner.card_id}${buildFilterQuery(filtersRef.current)}`,
    );
    const { cards: next } = (await res.json()) as { cards?: Card[] };
    const fresh = next?.find((card) => card.card_id !== winner.card_id);
    // No fresh challenger fits the filters; fall back to a full reload, which surfaces
    // the empty-pool message rather than leaving a stuck board.
    if (!fresh) {
      loadNextPair();
      return;
    }

    setPos((prev) => ({ ...prev, [loser.card_id]: "above" }));

    setTimeout(() => {
      setPickedId(null);
      setHoveredId(null);
      // Drop the leaving loser's float and guard the incoming card against any stale
      // one, so a recurring card_id never re-plays an old "-Y" as it slides in. (The
      // winner stays on the board, so its "+X" is left to finish and self-clear.)
      clearFloat(loser.card_id);
      clearFloat(fresh.card_id);
      setCards((prev) =>
        prev!.map((card) => (card.card_id === loser.card_id ? fresh : card)),
      );
      setPos((prev) => {
        const updated = { ...prev };
        delete updated[loser.card_id];
        updated[fresh.card_id] = "below";
        return updated;
      });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPos((prev) => ({ ...prev, [fresh.card_id]: "center" }));
          setTimeout(() => setReady(true), 500);
        }),
      );
    }, 500);
  }

  async function handlePick(winner: Card) {
    if (!ready || !cards) return;
    const loser = cards.find((card) => card.card_id !== winner.card_id)!;
    setReady(false);
    setPickedId(winner.card_id);

    // Extend the streak if the same card won again, otherwise start a new one.
    setStreak((prev) => (winner.card_id === streakCardId ? prev + 1 : 1));
    setStreakCardId(winner.card_id);

    const playerId = getPlayerId();
    // Await the comparison before fetching the next card so the swap's "already
    // compared" history includes this result (otherwise the just-beaten loser
    // could be served right back as the fresh challenger).
    const res = await fetch("/api/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        winnerCardId: winner.card_id,
        loserCardId: loser.card_id,
      }),
    });

    // Float the rating change beside each card (+X green winner, -Y red loser), each
    // drifting out toward its own side. cards[0] renders on the left, cards[1] right.
    const { winnerDelta, loserDelta } = (await res.json()) as {
      winnerDelta: number;
      loserDelta: number;
    };
    const winnerSide = cards[0].card_id === winner.card_id ? "left" : "right";
    showFloat(winner.card_id, winnerDelta, winnerSide);
    showFloat(loser.card_id, loserDelta, winnerSide === "left" ? "right" : "left");

    if (keepWinnerRef.current) {
      await swapLoserForFresh(winner, loser, playerId);
    } else {
      setPos(positionsFor(cards, "above"));
      setTimeout(() => loadNextPair(), 500);
    }
  }

  // Desktop shortcut: Left/Right arrow picks the left/right card. cards[0] and
  // cards[1] match the render order below, and Keep Winner replaces the loser in
  // place so the index→side mapping stays stable across rounds. handlePick itself
  // guards on `ready`, so mid-animation key presses are ignored.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!cards) return;
      if (event.key === "ArrowLeft") handlePick(cards[0]);
      else if (event.key === "ArrowRight") handlePick(cards[1]);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Commit the modal's selection and immediately reload under the new constraints. The
  // ref is set synchronously so the loadNextPair call below reads the new filters (the
  // backing effect would only update it after this render).
  function applyFilters(next: Filters) {
    setFilters(next);
    filtersRef.current = next;
    setFilterOpen(false);
    setReady(false);
    loadNextPair();
  }

  return (
    <div className="relative flex flex-1 overflow-hidden bg-white">
      <PanelLeft filters={filters} onOpenFilter={() => setFilterOpen(true)} />

      <ComparisonArea
        cards={cards}
        pos={pos}
        pickedId={pickedId}
        hoveredId={hoveredId}
        ready={ready}
        floats={floats}
        streak={streak}
        streakCardId={streakCardId}
        poolEmpty={poolEmpty}
        onPick={handlePick}
        onHover={setHoveredId}
        onFloatEnd={clearFloat}
      />

      <PanelRight
        keepWinner={keepWinner}
        onToggleKeepWinner={() => setKeepWinner((on) => !on)}
      />

      {/* Mounted only while open so its working state resets from `filters` each time. */}
      {filterOpen && (
        <FilterModal
          initial={filters}
          onApply={applyFilters}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </div>
  );
}
