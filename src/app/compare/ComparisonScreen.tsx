"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerId } from "@/lib/playerId";
import { updateRating, DEFAULT_RATING, type GlickoRating } from "@/lib/glicko2";
import { flameColor } from "@/lib/streak";
import FilterModal, {
  EMPTY_FILTERS,
  hasActiveFilters,
  type Filters,
} from "@/components/FilterModal";
import FilterButton from "@/components/FilterButton";
import KeepWinnerToggle from "@/components/KeepWinnerToggle";
import PanelLeft from "@/components/PanelLeft";
import PanelRight from "@/components/PanelRight";
import StreakLegend from "@/components/StreakLegend";
import { getImageProps } from "next/image";
import ComparisonArea, {
  CARD_IMAGE,
  type Card,
  type Position,
  type Exit,
} from "./ComparisonArea";
import Clefairy from "./Clefairy";

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
// Bump the version suffix whenever the saved Card shape changes: a restored held winner
// is never refetched (picks only fold rating fields into it), so a stale save would keep
// showing outdated fields for as long as that card stays on the board. v2: cards carry
// set/pack/release_date for the info flip.
const COMPARISON_STORAGE_KEY = "pokemash:comparison:v2";

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
  if (filters.minElo) params.set("minElo", filters.minElo);
  const query = params.toString();
  return query ? `&${query}` : "";
}

// Warm-up state per source URL: absent = never warmed, false = download/decode still in
// flight, true = decoded and cached. Only a `true` image is safe to mount with no visible
// load, so the swap fast paths gate on imageReady — a preloaded card whose art is still
// in flight takes the slower slide path instead, buying the download time to finish.
const imageWarmth = new Map<string, boolean>();

function imageReady(url: string): boolean {
  return imageWarmth.get(url) === true;
}

// Warm the browser image cache for a card likely to appear next, so its <Image> renders
// from cache with no visible load when it mounts. next/image rewrites the source URL into
// an /_next/image?url=…&w=…&q=… request, so we must warm THAT — warming the raw
// pkmncards.com URL fills the cache with a URL the mounted card never asks for.
// getImageProps resolves the same src/srcSet the <Image> in ComparisonArea will render
// (same CARD_IMAGE dimensions), and mirroring srcSet/sizes onto the warm-up Image makes
// the browser run the same candidate selection, hitting the identical URL at mount.
function warmImage(url: string) {
  if (typeof window === "undefined" || imageWarmth.has(url)) return;
  imageWarmth.set(url, false);
  const { props } = getImageProps({ src: url, alt: "", ...CARD_IMAGE });
  const img = new window.Image();
  if (props.sizes) img.sizes = props.sizes;
  if (props.srcSet) img.srcset = props.srcSet;
  img.src = props.src;
  img.decode().then(
    () => imageWarmth.set(url, true),
    () => imageWarmth.delete(url), // failed/aborted: forget it so a later warm can retry
  );
}

// Identifies the exact on-screen state a fresh-pair preload was fetched for: the pair,
// the mode, and the active filters. If any of these changes, the preload is stale and
// must be ignored. (Keep Winner queues use filterKey + the winner's on-board presence
// instead — a queue survives across picks as long as its winner keeps winning.)
function pairKey(cards: Card[], keepWinner: boolean, filters: Filters): string {
  const ids = cards.map((card) => card.card_id).sort().join(",");
  return `${keepWinner ? "keep" : "fresh"}|${buildFilterQuery(filters)}|${ids}`;
}

// The prefetched next comparison. "keep": a shallow QUEUE of challengers per possible
// winner (Keep Winner mode) — a pick consumes the winner's head and recycles the loser's
// leftover queue into `donated`, so a click can never outrun a single in-flight fetch.
// "fresh": a whole new pair (Keep Winner off). filterKey/key tie a preload to the state
// it's valid for; any mismatch falls back to a normal fetch.
type Preload =
  | {
      mode: "keep";
      filterKey: string;
      queues: Record<string, Card[]>;
      // Hand-me-downs from beaten opponents: already-fetched (and mostly decoded)
      // speculation that was rating-matched to the card it was queued FOR, not the
      // current winner. Kept as a warm stopgap so switching winners stays fast; they
      // don't count toward QUEUE_DEPTH, so `queues` rebuilds fresh entries matched to
      // the new winner underneath while these bridge the gap.
      donated: Record<string, Card[]>;
    }
  | { mode: "fresh"; key: string; pair: Card[] };

// Challengers to keep queued per potential winner. Deep enough that rapid picks can't
// drain it before a refill lands, shallow enough that entries stay fresh (a queued
// matchup was chosen against the winner's rating at fetch time, which keeps moving).
const QUEUE_DEPTH = 3;
// Only the front of each queue gets its image downloaded+decoded ahead of time — warming
// all of it would spend bandwidth on art that is often discarded with the losing side.
const WARM_DEPTH = 2;

// Pop the best available challenger for a pick, drawing from the winner's fresh queue
// and its donated hand-me-downs (in that order). Entries colliding with the on-board
// pair are dropped, then the first card whose art is already decoded wins — a decoded
// donated card beats an undecoded fresh one, because only a decoded image can take the
// one-motion overlap path. With nothing decoded, fall back to the freshest entry: its
// slide-in buys the image time to finish.
function popChallenger(
  lists: (Card[] | undefined)[],
  onBoard: Set<string>,
): Card | undefined {
  for (const list of lists) {
    if (!list) continue;
    for (let i = list.length - 1; i >= 0; i--) {
      if (onBoard.has(list[i].card_id)) list.splice(i, 1);
    }
  }
  for (const list of lists) {
    const ready = list?.findIndex((card) => imageReady(card.image_url)) ?? -1;
    if (list && ready >= 0) return list.splice(ready, 1)[0];
  }
  for (const list of lists) {
    if (list?.length) return list.shift();
  }
  return undefined;
}

// A one-deep snapshot of the board taken just BEFORE a pick, so the "Go back" button can
// restore that matchup for reselection. Holds the pre-pick pair (carrying its pre-pick
// ratings), the streak/picks counters, the two card ids, and the pick's own persistence
// POST — undo waits on that before reversing the server writes, so it can't race the
// insert/upsert it means to undo. Only one is ever kept, capping undo at a single step.
type Snapshot = {
  pair: Card[];
  streak: number;
  streakCardId: string | null;
  picks: number;
  winnerId: string;
  loserId: string;
  postDone: Promise<unknown>;
};

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

  // The single previous matchup the "Go back" button can restore (null = nothing to undo).
  // Set on each pick, consumed on undo — so undo can only ever step back one matchup.
  const [lastPick, setLastPick] = useState<Snapshot | null>(null);

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
  // Winner ids with a queue top-off fetch in flight, so the preload effect re-firing
  // (every board change) can't stack duplicate requests for the same side.
  const preloadInFlightRef = useRef<Set<string>>(new Set());
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
  // can use it instantly. Keep Winner: top each possible winner's challenger queue up to
  // QUEUE_DEPTH (excluding the current opponent and everything already queued, so nothing
  // is served twice); each side's fetch lands independently — a click between the two
  // still gets whichever queue already arrived. Off: a whole fresh pair. Results are
  // dropped if the mode/filters changed (store replaced) or the winner left the board.
  // Named function expression (not an arrow) so the refill chaining below can call
  // itself by name — the `const preloadNext` binding isn't referenceable from inside
  // its own initializer.
  const preloadNext = useCallback(async function preloadNextInner() {
    const current = cardsRef.current;
    if (!current || current.length < 2) return;
    const keep = keepWinnerRef.current;
    const filters = filtersRef.current;
    const playerId = getPlayerId();
    const query = buildFilterQuery(filters);

    if (keep) {
      // A store from another mode or filter set is dead; start over. (In-flight fetches
      // tied to the old store notice `preloadRef.current !== store` and drop themselves.)
      if (preloadRef.current?.mode !== "keep" || preloadRef.current.filterKey !== query) {
        preloadRef.current = { mode: "keep", filterKey: query, queues: {}, donated: {} };
      }
      const store = preloadRef.current;
      for (const winner of current) {
        const opponent = current.find((card) => card.card_id !== winner.card_id)!;
        const queue = (store.queues[winner.card_id] ??= []);
        const donated = (store.donated[winner.card_id] ??= []);
        // Re-warm the front on every pass: after a pick consumes the head, the next
        // entries move into WARM_DEPTH range (warmImage dedupes, so this is cheap).
        // Donated cards back-fill the warm window while the fresh queue is short.
        [...queue, ...donated]
          .slice(0, WARM_DEPTH)
          .forEach((card) => warmImage(card.image_url));
        // Donated cards deliberately don't reduce `need`: they're stopgaps matched to a
        // beaten opponent's rating, so the fresh queue still rebuilds to full depth and
        // supersedes them as its entries decode.
        const need = QUEUE_DEPTH - queue.length;
        if (need <= 0 || preloadInFlightRef.current.has(winner.card_id)) continue;
        preloadInFlightRef.current.add(winner.card_id);
        const exclude = [
          opponent.card_id,
          ...[...queue, ...donated].map((card) => card.card_id),
        ].join(",");
        fetch(
          `/api/comparison/next?playerId=${playerId}&winnerId=${winner.card_id}&excludeId=${exclude}&count=${need}${query}`,
        )
          .then((res) => res.json())
          .then(({ cards: next }: { cards?: Card[] }) => {
            if (preloadRef.current !== store) return; // mode/filters changed meanwhile
            const board = cardsRef.current;
            if (!board?.some((card) => card.card_id === winner.card_id)) return; // winner left
            const onBoard = new Set(board.map((card) => card.card_id));
            // Re-read the donated list: a pick made during this fetch may have replaced
            // it with hand-me-downs the request's exclude list never knew about.
            const handMeDowns = store.donated[winner.card_id] ?? [];
            // next[0] is the winner echoed back; the rest are the fresh challengers.
            for (const card of next?.slice(1) ?? []) {
              if (queue.length >= QUEUE_DEPTH) break;
              if (onBoard.has(card.card_id)) continue;
              if (queue.some((queued) => queued.card_id === card.card_id)) continue;
              if (handMeDowns.some((queued) => queued.card_id === card.card_id)) continue;
              queue.push(card);
            }
            [...queue, ...handMeDowns]
              .slice(0, WARM_DEPTH)
              .forEach((card) => warmImage(card.image_url));
          })
          .catch(() => {}) // preload is best-effort; a pick just falls back to fetching
          .finally(() => {
            preloadInFlightRef.current.delete(winner.card_id);
            // Picks made while this fetch was in flight were skipped by the guard above,
            // so the queue may have fallen behind. Re-run the top-off with `need`
            // recomputed NOW (a lagging refill asks for 2+ in one request); once the
            // queue is full this recursion no-ops, so it can't loop.
            preloadNextInner();
          });
      }
    } else {
      const key = pairKey(current, false, filters);
      if (preloadRef.current?.mode === "fresh" && preloadRef.current.key === key) return;
      const stale = () =>
        pairKey(cardsRef.current ?? [], keepWinnerRef.current, filtersRef.current) !== key;
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
  // saved, fetch the first pair instead. Both paths set state on mount deliberately
  // (the fetch path is async, so no sync cascade).
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
  // `slideStart`); slide a fresh challenger up into the loser's slot. The caller passes
  // `preChallenger` when the winner's queue had a card (its image just wasn't decoded in
  // time for the overlap path); with an empty queue we fetch one. The dials already spun
  // instantly (client-computed), so nothing waits on the POST.
  async function swapLoserForFresh(
    winner: Card,
    loser: Card,
    playerId: string,
    slideStart: number,
    preChallenger?: Card,
  ) {
    let fresh = preChallenger;
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
    // Board state as it stands right now, BEFORE this pick — the "Go back" restore point.
    // pair still references the pre-pick card objects (setCards below builds new ones), and
    // streak/streakCardId/picks are this render's values, so they're all pre-pick.
    const prevStreak = streak;
    const prevStreakCardId = streakCardId;
    const prevPicks = picks;
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
    // ratings, so its result matches ours — we don't need to wait for or read it. The
    // promise is kept so an undo can wait for this write to land before reversing it.
    const playerId = getPlayerId();
    const postDone = fetch("/api/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        winnerCardId: winner.card_id,
        loserCardId: loser.card_id,
      }),
    }).catch(() => {});

    // Arm "Go back" with this matchup's pre-pick snapshot (replacing any earlier one, so
    // only the most recent pick is undoable).
    setLastPick({
      pair,
      streak: prevStreak,
      streakCardId: prevStreakCardId,
      picks: prevPicks,
      winnerId: winner.card_id,
      loserId: loser.card_id,
      postDone,
    });

    if (keepWinnerRef.current) {
      // Pop the winner's challenger queue. The queue outlives the pick (unlike the old
      // one-shot preload): its remaining entries stay valid while this winner holds the
      // board, and the preload effect tops it back up after the swap.
      const store =
        preloadRef.current?.mode === "keep" &&
        preloadRef.current.filterKey === buildFilterQuery(filtersRef.current)
          ? preloadRef.current
          : undefined;
      if (store) {
        // The loser's leftover speculation was matched to the LOSER's rating — but the
        // two cards were just on the board together (rating-adjacent by construction),
        // so recycle it as the winner's warm stopgap instead of discarding paid-for
        // fetches. This must happen BEFORE the pop below: on a winner switch the new
        // winner's own queue is usually still fetching, so THIS pick's challenger has
        // to come from the hand-me-downs — donating after the pop would only ever help
        // the pick after, and a switch pick would stay slow forever. Dedupe against
        // everything the winner already holds (the two sides' queues are fetched
        // independently, so they CAN contain the same card).
        const held = new Set([
          winner.card_id,
          ...(store.queues[winner.card_id] ?? []).map((card) => card.card_id),
          ...(store.donated[winner.card_id] ?? []).map((card) => card.card_id),
        ]);
        const leftovers = [
          ...(store.queues[loser.card_id] ?? []),
          ...(store.donated[loser.card_id] ?? []),
        ].filter((card) => !held.has(card.card_id));
        store.donated[winner.card_id] = [
          ...(store.donated[winner.card_id] ?? []),
          ...leftovers,
        ].slice(0, QUEUE_DEPTH);
        delete store.queues[loser.card_id];
        delete store.donated[loser.card_id];
      }
      const challenger = popChallenger(
        [store?.queues[winner.card_id], store?.donated[winner.card_id]],
        new Set([winner.card_id, loser.card_id]),
      );

      if (challenger && imageReady(challenger.image_url)) {
        // Fast path: challenger in hand AND its art decoded — overlap the loser leaving
        // with the challenger arriving (one motion) instead of loser-out-THEN-card-in.
        overlapSwap(loser, challenger, loserDial);
      } else {
        // No decoded challenger: start the loser sliding out now (instant reaction), then
        // slide the challenger in once the slide (and, if the queue was empty, a fetch)
        // is done — the slide buys a still-loading image time to finish.
        setPos((prev) => ({ ...prev, [loser.card_id]: "above" }));
        if (challenger) warmImage(challenger.image_url);
        swapLoserForFresh(winner, loser, playerId, performance.now(), challenger);
      }
    } else {
      // Use the preloaded fresh pair if it's still valid; otherwise fetch after the slide.
      const key = pairKey(pair, false, filtersRef.current);
      const pre = preloadRef.current;
      preloadRef.current = null;
      const preloadedPair = pre?.mode === "fresh" && pre.key === key ? pre.pair : null;
      // Overlapping needs disjoint ids: `pos` and the exit overlays are keyed by card_id,
      // so a card in both pairs would have to be "above" and "below" at once. It also
      // needs both incoming images decoded — otherwise the sequential path below buys
      // them the slide-out to finish loading.
      const disjoint =
        preloadedPair &&
        !preloadedPair.some((card) => pair.some((old) => old.card_id === card.card_id));
      if (preloadedPair && disjoint && preloadedPair.every((card) => imageReady(card.image_url))) {
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

  // "Go back": restore the previous matchup so the user can reselect. Only allowed on a
  // settled board (guards against undoing mid-swap). Restores instantly — the pair snaps
  // back to center, like the on-mount sessionStorage restore — then reverses the server
  // writes. The snapshot is consumed (setLastPick(null)), so at most one step back exists.
  async function handleUndo() {
    const snap = lastPick;
    if (!snap || !ready) return;

    setExiting([]);
    setPickedId(null);
    setHoveredId(null);
    setCards(snap.pair);
    setPos(positionsFor(snap.pair, "center"));
    setStreak(snap.streak);
    setStreakCardId(snap.streakCardId);
    setPicks(snap.picks);
    // The preload was built around the post-pick board; drop it so the effect rebuilds it
    // for the restored pair. In-flight fetches tied to the old store discard themselves.
    preloadRef.current = null;
    setLastPick(null);
    setReady(true);

    // Reverse the server writes, but only AFTER the pick's own POST settles — otherwise a
    // slow insert/upsert could land after the undo and resurrect the pick.
    await snap.postDone;
    fetch("/api/comparison/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: getPlayerId(),
        winnerCardId: snap.winnerId,
        loserCardId: snap.loserId,
        ratings: snap.pair.map((card) => ({ card_id: card.card_id, ...ratingOf(card) })),
      }),
    }).catch(() => {});
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

  // The legend explains the glow colors, so it appears only while a glow is actually
  // on the board (same tier walk as the card's flame) — otherwise it's a key to
  // nothing and just clutters the screen.
  const legendVisible = flameColor(streak) !== null;

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

      {/* Mobile-only streak legend (it lives in PanelLeft on md+). An absolute overlay
          under the Filter trigger rather than a flex row: it must not reserve a band of
          layout between the toolbar and the board (the board centers in ALL the space
          below the toolbar, and the legend is usually invisible anyway). */}
      <div className="pointer-events-none absolute left-4 top-16 z-20 md:hidden">
        <StreakLegend visible={legendVisible} className="flex-col gap-2" />
      </div>

      <PanelLeft
        filters={filters}
        onOpenFilter={() => setFilterOpen(true)}
        legendVisible={legendVisible}
      />

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
        canUndo={lastPick !== null && ready}
        onUndo={handleUndo}
      />

      <PanelRight
        keepWinner={keepWinner}
        onToggleKeepWinner={() => setKeepWinner((on) => !on)}
      />

      {/* Roams the whole play screen (this relative, overflow-hidden container) at
          z-0, UNDER the board's z-10 — so she can wander behind the cards and peek
          out, and the container edge clips her off-screen wrap walk. */}
      <Clefairy picks={picks} />

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
