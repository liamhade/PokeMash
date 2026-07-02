"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerId } from "@/lib/playerId";
import { updateRating, DEFAULT_RATING, type GlickoRating } from "@/lib/glicko2";
import FilterModal, {
  EMPTY_FILTERS,
  hasActiveFilters,
  type Filters,
} from "@/components/FilterModal";
import FilterButton from "@/components/FilterButton";
import KeepWinnerToggle from "@/components/KeepWinnerToggle";
import PanelLeft from "@/components/PanelLeft";
import PanelRight from "@/components/PanelRight";
import ComparisonArea, {
  type Card,
  type Position,
  type Exit,
} from "./ComparisonArea";

function positionsFor(cards: Card[], position: Position): Record<string, Position> {
  return Object.fromEntries(cards.map((card) => [card.card_id, position]));
}

// How long a card takes to slide in/out. The setTimeouts below wait this long for the CSS
// transition to finish, so this MUST match `duration-[…]` on the card in ComparisonArea.
// Tune both together to make the board feel snappier or calmer.
const SLIDE_MS = 350;

// A card's Glicko-2 rating for the client-side delta calc, falling back to the default when
// a restored card predates the r/rd/mu fields.
function ratingOf(card: Card): GlickoRating {
  return card.r != null && card.rd != null && card.mu != null
    ? { r: card.r, rd: card.rd, mu: card.mu }
    : DEFAULT_RATING;
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
  // Cards sliding OUT rendered as absolute overlays in the incoming cards' slots, so they
  // can leave while their replacements arrive (one motion). `overId` is the incoming card
  // whose slot hosts the overlay; each departing card's own position drives its slide.
  const [exiting, setExiting] = useState<Exit[]>([]);
  const [keepWinner, setKeepWinner] = useState(true);
  // True only when both cards are settled at center and a pick is allowed. Guards
  // against picking mid-animation or double-submitting a comparison.
  const [ready, setReady] = useState(false);

  // Consecutive wins of the currently-held card, for the streak flame. streakCardId
  // is which card the streak belongs to; it resets when a different card wins.
  const [streak, setStreak] = useState(0);
  const [streakCardId, setStreakCardId] = useState<string | null>(null);
  // Total picks this mount, for the Critter's per-pick hop (not persisted anywhere).
  const [picks, setPicks] = useState(0);

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

  // Prefetch the next comparison as soon as the pair is KNOWN — at swap start, not once
  // it settles (`ready`). That gives the preload a ~SLIDE_MS head start, so rapid picks
  // are far more likely to hit the overlap fast path instead of a blank-slot fetch.
  // preloadNext only touches refs and the image cache (no setState), so it neither
  // re-renders nor trips the lint rule.
  useEffect(() => {
    if (cards && cards.length === 2) preloadNext();
  }, [cards, keepWinner, preloadNext]);

  // Keep Winner mode: the loser is already sliding out (started in handlePick, at
  // `slideStart`); pick a fresh challenger and slide it up into the loser's slot. The
  // dials already spun instantly (client-computed), so nothing waits on the POST.
  async function swapLoserForFresh(
    winner: Card,
    loser: Card,
    playerId: string,
    slideStart: number,
  ) {
    // Use the preloaded challenger for this winner when it's still valid; otherwise fetch
    // (excluding the loser so it isn't re-served). Consume the preload so it can't be reused.
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
      loadNextPair();
      return;
    }
    const challenger = fresh;

    // Swap once the loser's slide is done — measured from when the slide STARTED (pick
    // time), not from when the fetch resolved. A fixed SLIDE_MS wait here would stack a
    // whole extra slide on top of the fetch, leaving the slot blank ~350ms longer on
    // every preload miss. (Both cards' new ratings were already folded into state at
    // pick time, so only the loser→challenger replacement remains.)
    const remaining = Math.max(0, SLIDE_MS - (performance.now() - slideStart));
    setTimeout(() => {
      setHoveredId(null);
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
    }, remaining);
  }

  // Preload-hit fast path: slide the loser OUT and the challenger IN at the same time. The
  // loser becomes an absolute overlay in the challenger's slot (`exiting`) so it leaves the
  // flex flow and the challenger takes the slot — one ~SLIDE_MS motion instead of two. The
  // loser's dial (`loserDial`) rides along, ticking down under the slot.
  // pickedId is deliberately NOT cleared here (or in the other swap paths): the winner's
  // one-shot flash must outlive the swap, and it re-keys/moves on the next pick anyway.
  function overlapSwap(loser: Card, challenger: Card, loserDial: Exit["dial"]) {
    setHoveredId(null);
    setExiting([{ card: loser, overId: challenger.card_id, dial: loserDial }]);
    setCards((prev) =>
      prev!.map((card) => (card.card_id === loser.card_id ? challenger : card)),
    );
    // Challenger mounts below; the loser overlay stays at center (where it was).
    setPos((prev) => ({ ...prev, [challenger.card_id]: "below", [loser.card_id]: "center" }));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // Both slide up together: loser out the top, challenger up into the slot.
        setPos((prev) => ({ ...prev, [challenger.card_id]: "center", [loser.card_id]: "above" }));
        setTimeout(() => {
          setExiting([]);
          setPos((prev) => {
            const updated = { ...prev };
            delete updated[loser.card_id];
            return updated;
          });
          setReady(true);
        }, SLIDE_MS);
      }),
    );
  }

  // Preload-hit fast path with Keep Winner off: the whole old pair slides out the top
  // while the new pair rises from below — one motion instead of out-then-blank-then-in.
  // Each departing card overlays the slot of the incoming card on its side (left stays
  // left), with its dial tween riding along.
  function overlapFresh(oldPair: Card[], next: Card[], exits: Exit[]) {
    setHoveredId(null);
    setExiting(exits);
    setCards(next);
    // New pair mounts below; the old pair's overlays keep their center position.
    setPos((prev) => ({ ...prev, [next[0].card_id]: "below", [next[1].card_id]: "below" }));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPos((prev) => ({
          ...prev,
          [next[0].card_id]: "center",
          [next[1].card_id]: "center",
          [oldPair[0].card_id]: "above",
          [oldPair[1].card_id]: "above",
        }));
        setTimeout(() => {
          setExiting([]);
          setPos((prev) => {
            const updated = { ...prev };
            delete updated[oldPair[0].card_id];
            delete updated[oldPair[1].card_id];
            return updated;
          });
          setReady(true);
        }, SLIDE_MS);
      }),
    );
  }

  function handlePick(winner: Card) {
    if (!ready || !cards) return;
    const pair = cards; // capture before the state below changes
    const loser = pair.find((card) => card.card_id !== winner.card_id)!;
    setReady(false);
    setPickedId(winner.card_id);

    // Extend the streak if the same card won again, otherwise start a new one.
    setStreak((prev) => (winner.card_id === streakCardId ? prev + 1 : 1));
    setStreakCardId(winner.card_id);
    setPicks((prev) => prev + 1);

    // Compute the Glicko-2 change on the client (same inputs the POST uses) and fold both
    // new ratings into the on-board cards IMMEDIATELY, instead of waiting on the server
    // round-trip: each card's RatingDial sees its value change and spins to the new number.
    // Both updates read each other's pre-update rating, matching the server.
    const winnerRating = ratingOf(winner);
    const loserRating = ratingOf(loser);
    const newWinnerRating = updateRating(winnerRating, loserRating, 1);
    const newLoserRating = updateRating(loserRating, winnerRating, 0);
    setCards((prev) =>
      prev!.map((card) => {
        if (card.card_id === winner.card_id) return { ...card, ...newWinnerRating };
        if (card.card_id === loser.card_id) return { ...card, ...newLoserRating };
        return card;
      }),
    );
    // The overlap swap replaces the loser's slot before its dial can spin from card state,
    // so the exit overlay's dial is told the tween endpoints explicitly.
    const loserDial = { from: Math.round(loserRating.r), to: Math.round(newLoserRating.r) };

    // Persist in the background (fire-and-forget). The server recomputes from the same
    // ratings, so its result matches ours — we don't need to wait for or read it.
    const playerId = getPlayerId();
    fetch("/api/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        winnerCardId: winner.card_id,
        loserCardId: loser.card_id,
      }),
    }).catch(() => {});

    if (keepWinnerRef.current) {
      // Fast path: if the challenger is already preloaded, overlap the loser leaving with
      // the challenger arriving (one motion) instead of loser-out-THEN-card-in.
      const key = pairKey([winner, loser], true, filtersRef.current);
      const pre = preloadRef.current;
      const preChallenger =
        pre?.mode === "keep" && pre.key === key ? pre.challengers[winner.card_id] : undefined;
      if (preChallenger && preChallenger.card_id !== loser.card_id) {
        preloadRef.current = null;
        overlapSwap(loser, preChallenger, loserDial);
      } else {
        // Preload missed: start the loser sliding out now (instant reaction), then fetch the
        // challenger and slide it in as soon as both the fetch and the slide are done.
        setPos((prev) => ({ ...prev, [loser.card_id]: "above" }));
        swapLoserForFresh(winner, loser, playerId, performance.now());
      }
    } else {
      // Use the preloaded fresh pair if it's still valid; otherwise fetch after the slide.
      const key = pairKey(pair, false, filtersRef.current);
      const pre = preloadRef.current;
      preloadRef.current = null;
      const preloadedPair = pre?.mode === "fresh" && pre.key === key ? pre.pair : null;
      // Overlapping needs disjoint ids: `pos` and the exit overlays are keyed by card_id,
      // so a card in both pairs would have to be "above" and "below" at once.
      const disjoint =
        preloadedPair &&
        !preloadedPair.some((card) => pair.some((old) => old.card_id === card.card_id));
      if (preloadedPair && disjoint) {
        const winnerDial = {
          from: Math.round(winnerRating.r),
          to: Math.round(newWinnerRating.r),
        };
        overlapFresh(
          pair,
          preloadedPair,
          pair.map((old, i) => ({
            card: old,
            overId: preloadedPair[i].card_id,
            dial: old.card_id === winner.card_id ? winnerDial : loserDial,
          })),
        );
      } else {
        setPos(positionsFor(pair, "above"));
        setTimeout(() => (preloadedPair ? mountPair(preloadedPair) : loadNextPair()), SLIDE_MS);
      }
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
    // Stacks vertically on phones (toolbar over the board); md and up is the original
    // row of PanelLeft | ComparisonArea | PanelRight, untouched.
    <div className="relative flex flex-col md:flex-row flex-1 overflow-hidden bg-white">
      {/* Mobile-only toolbar carrying the side panels' controls (they're hidden < md). */}
      <div className="flex items-center justify-between px-4 pt-3 md:hidden">
        <div className="relative">
          <FilterButton onClick={() => setFilterOpen(true)} />
          {hasActiveFilters(filters) && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white"
            />
          )}
        </div>
        <KeepWinnerToggle keepWinner={keepWinner} onToggle={() => setKeepWinner((on) => !on)} />
      </div>

      <PanelLeft filters={filters} onOpenFilter={() => setFilterOpen(true)} />

      <ComparisonArea
        cards={cards}
        pos={pos}
        pickedId={pickedId}
        hoveredId={hoveredId}
        ready={ready}
        streak={streak}
        streakCardId={streakCardId}
        poolEmpty={poolEmpty}
        picks={picks}
        exiting={exiting}
        onPick={handlePick}
        onHover={setHoveredId}
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
