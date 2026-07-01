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

// How long a card takes to slide in/out. The setTimeouts below wait this long for the CSS
// transition to finish, so this MUST match `duration-[…]` on the card in ComparisonArea.
// Tune both together to make the board feel snappier or calmer.
const SLIDE_MS = 350;

// After a pick, the losing card is held on the board at least this long once its -Y number
// appears, so the number is actually seen even if the (background) result POST is slow.
const FLOAT_MIN_MS = 250;

// A promise that resolves after `ms` — lets async flows await an animation/visibility beat.
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

// Warm the browser image cache for a card likely to appear next, so its <Image> renders
// from cache with no visible load when it mounts.
function warmImage(url: string) {
  if (typeof window === "undefined") return;
  const img = new window.Image();
  img.src = url;
}

// Identifies the exact on-screen state a preload was fetched for: the pair, the mode, and
// the active filters. If any of these changes, the preload is stale and must be ignored.
function pairKey(cards: Card[], keepWinner: boolean, filters: Filters): string {
  const ids = cards.map((card) => card.card_id).sort().join(",");
  return `${keepWinner ? "keep" : "fresh"}|${buildFilterQuery(filters)}|${ids}`;
}

// The prefetched next comparison. "keep": a fresh challenger per possible winner (Keep
// Winner mode). "fresh": a whole new pair (Keep Winner off). `key` ties it to the state
// it's valid for; any mismatch falls back to a normal fetch.
type Preload =
  | { mode: "keep"; key: string; challengers: Record<string, Card> }
  | { mode: "fresh"; key: string; pair: Card[] };

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

  // Prefetched next comparison, warmed while the current pair is on screen so a pick can
  // advance without waiting on a fetch. Purely an optimization: any key mismatch falls
  // back to the normal fetch path. cardsRef lets async preloads notice the board changed.
  const preloadRef = useRef<Preload | null>(null);
  const cardsRef = useRef<Card[] | null>(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Animate a chosen pair in from below to center. Shared by the fetch path and the
  // preload path (which supplies the pair directly, skipping the fetch). Clears the
  // outgoing cards first so the new pair mounts below without the old ones flashing.
  const mountPair = useCallback((next: Card[]) => {
    setPickedId(null);
    setHoveredId(null);
    setCards(null);
    setPos({});
    setFloats({}); // a fresh pair carries no rating floats from the previous round
    setPoolEmpty(false);
    requestAnimationFrame(() => {
      setCards(next);
      setPos(positionsFor(next, "below"));
      // Let the blank screen render for a beat before the cards slide in.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPos(positionsFor(next, "center"));
          setTimeout(() => setReady(true), SLIDE_MS);
        }),
      );
    });
  }, []);

  const loadNextPair = useCallback(async () => {
    const playerId = getPlayerId();
    const res = await fetch(
      `/api/comparison/next?playerId=${playerId}${buildFilterQuery(filtersRef.current)}`,
    );
    const { cards: next } = (await res.json()) as { cards?: Card[] };

    // Filters can match fewer than two cards; clear the board and show a message.
    if (!next || next.length < 2) {
      setPickedId(null);
      setHoveredId(null);
      setCards(null);
      setPos({});
      setFloats({});
      setPoolEmpty(true);
      return;
    }
    mountPair(next);
  }, [mountPair]);

  // Prefetch what comes after the current settled pair and warm its image(s), so a pick
  // can use it instantly. Keep Winner: a challenger per possible winner (excluding the
  // current opponent so it isn't re-served). Off: a whole fresh pair. Results are dropped
  // if the board changed while fetching (captured `key` no longer matches).
  const preloadNext = useCallback(async () => {
    const current = cardsRef.current;
    if (!current || current.length < 2) return;
    const keep = keepWinnerRef.current;
    const filters = filtersRef.current;
    const key = pairKey(current, keep, filters);
    if (preloadRef.current?.key === key) return; // already preloaded for this state
    const playerId = getPlayerId();
    const query = buildFilterQuery(filters);
    const stale = () =>
      pairKey(cardsRef.current ?? [], keepWinnerRef.current, filtersRef.current) !== key;

    if (keep) {
      const entries = await Promise.all(
        current.map(async (winner) => {
          const opponent = current.find((card) => card.card_id !== winner.card_id)!;
          const res = await fetch(
            `/api/comparison/next?playerId=${playerId}&winnerId=${winner.card_id}&excludeId=${opponent.card_id}${query}`,
          );
          const { cards: next } = (await res.json()) as { cards?: Card[] };
          const fresh = next?.find((card) => card.card_id !== winner.card_id) ?? null;
          return [winner.card_id, fresh] as const;
        }),
      );
      if (stale()) return;
      const challengers: Record<string, Card> = {};
      for (const [id, fresh] of entries) {
        if (fresh) {
          challengers[id] = fresh;
          warmImage(fresh.image_url);
        }
      }
      preloadRef.current = { mode: "keep", key, challengers };
    } else {
      const res = await fetch(`/api/comparison/next?playerId=${playerId}${query}`);
      const { cards: next } = (await res.json()) as { cards?: Card[] };
      if (stale()) return;
      if (next && next.length >= 2) {
        next.forEach((card) => warmImage(card.image_url));
        preloadRef.current = { mode: "fresh", key, pair: next };
      }
    }
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

  // Prefetch the next comparison once the current pair is settled and pickable. Re-runs
  // when the pair, readiness, or Keep Winner mode changes. preloadNext only touches refs
  // and the image cache (no setState), so it neither re-renders nor trips the lint rule.
  useEffect(() => {
    if (cards && ready) preloadNext();
  }, [cards, ready, keepWinner, preloadNext]);

  // Keep Winner mode: the loser is already sliding out (started in handlePick); pick a
  // fresh challenger and slide it up into the loser's slot. `pickedAt`/`postDone` gate the
  // swap so the loser stays until its -Y number has shown and the slide has finished.
  async function swapLoserForFresh(
    winner: Card,
    loser: Card,
    playerId: string,
    pickedAt: number,
    postDone: Promise<void>,
  ) {
    // Use the preloaded challenger for this winner when it's still valid; otherwise fetch
    // (excluding the loser, which the just-recorded result would exclude anyway). Consume
    // the preload either way so it can't be reused.
    const key = pairKey([winner, loser], true, filtersRef.current);
    const pre = preloadRef.current;
    preloadRef.current = null;
    let fresh =
      pre?.mode === "keep" && pre.key === key ? pre.challengers[winner.card_id] : undefined;
    if (!fresh) {
      const res = await fetch(
        `/api/comparison/next?playerId=${playerId}&winnerId=${winner.card_id}&excludeId=${loser.card_id}${buildFilterQuery(filtersRef.current)}`,
      );
      const { cards: next } = (await res.json()) as { cards?: Card[] };
      fresh = next?.find((card) => card.card_id !== winner.card_id);
    }
    // No fresh challenger fits the filters (or it collided with the loser); full reload,
    // which surfaces the empty-pool message rather than leaving a stuck board.
    if (!fresh || fresh.card_id === loser.card_id) {
      await postDone; // let the deltas float on the current pair before it clears
      loadNextPair();
      return;
    }
    const challenger = fresh;

    // Hold the loser until its -Y float has been shown (postDone) and the slide-out has
    // finished, plus a minimum beat so a slow POST's number is still seen. Only THEN swap
    // it out — otherwise the number lands after the card is already gone.
    await postDone;
    await delay(Math.max(SLIDE_MS - (Date.now() - pickedAt), FLOAT_MIN_MS));

    setPickedId(null);
    setHoveredId(null);
    // Drop the leaving loser's float and guard the incoming card against any stale one,
    // so a recurring card_id never re-plays an old "-Y" as it slides in. (The winner stays
    // on the board, so its "+X" is left to finish and self-clear.)
    clearFloat(loser.card_id);
    clearFloat(challenger.card_id);
    setCards((prev) =>
      prev!.map((card) => (card.card_id === loser.card_id ? challenger : card)),
    );
    setPos((prev) => {
      const updated = { ...prev };
      delete updated[loser.card_id];
      updated[challenger.card_id] = "below";
      return updated;
    });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPos((prev) => ({ ...prev, [challenger.card_id]: "center" }));
        setTimeout(() => setReady(true), SLIDE_MS);
      }),
    );
  }

  function handlePick(winner: Card) {
    if (!ready || !cards) return;
    const pair = cards; // capture before the state below changes
    const loser = pair.find((card) => card.card_id !== winner.card_id)!;
    const pickedAt = Date.now();
    setReady(false);
    setPickedId(winner.card_id);

    // Extend the streak if the same card won again, otherwise start a new one.
    setStreak((prev) => (winner.card_id === streakCardId ? prev + 1 : 1));
    setStreakCardId(winner.card_id);

    const playerId = getPlayerId();
    // Record the comparison in the BACKGROUND so the board can start moving immediately;
    // float the +/- deltas when it returns. The advance below waits on this before removing
    // the loser, so its -Y number always shows before the card leaves. Correctness holds
    // without blocking on it: the preloaded/fallback challenger already excludes the loser
    // via excludeId, so it can't be re-served this round.
    const postDone = fetch("/api/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        winnerCardId: winner.card_id,
        loserCardId: loser.card_id,
      }),
    })
      .then((res) => res.json())
      .then(({ winnerDelta, loserDelta }: { winnerDelta: number; loserDelta: number }) => {
        // pair[0] renders on the left, pair[1] right.
        const winnerSide = pair[0].card_id === winner.card_id ? "left" : "right";
        showFloat(winner.card_id, winnerDelta, winnerSide);
        showFloat(loser.card_id, loserDelta, winnerSide === "left" ? "right" : "left");
      })
      .catch(() => {});

    if (keepWinnerRef.current) {
      // React instantly: start the loser sliding out now, before resolving the challenger
      // (so there's no pause even when the preload missed and we have to fetch).
      setPos((prev) => ({ ...prev, [loser.card_id]: "above" }));
      swapLoserForFresh(winner, loser, playerId, pickedAt, postDone);
    } else {
      setPos(positionsFor(pair, "above"));
      // Use the preloaded fresh pair if it's still valid; otherwise fetch after the slide.
      const key = pairKey(pair, false, filtersRef.current);
      const pre = preloadRef.current;
      preloadRef.current = null;
      const preloadedPair = pre?.mode === "fresh" && pre.key === key ? pre.pair : null;
      // Wait for the deltas to float on the outgoing pair (and the slide) before swapping.
      postDone.then(() =>
        setTimeout(
          () => (preloadedPair ? mountPair(preloadedPair) : loadNextPair()),
          Math.max(SLIDE_MS - (Date.now() - pickedAt), FLOAT_MIN_MS),
        ),
      );
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
    preloadRef.current = null; // any preload was for the old filters
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
