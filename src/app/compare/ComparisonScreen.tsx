"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getPlayerId } from "@/lib/playerId";

type Card = { card_id: string; name: string; image_url: string };

// Each card tracks its own vertical position so that in "Keep Winner" mode we can
// hold the winner at center while only the loser slides out and is replaced.
type Position = "below" | "center" | "above";

const POSITION_CLASS: Record<Position, string> = {
  below: "translate-y-[120vh]",
  center: "translate-y-0",
  above: "-translate-y-[120vh]",
};

function positionsFor(cards: Card[], position: Position): Record<string, Position> {
  return Object.fromEntries(cards.map((card) => [card.card_id, position]));
}

// A floating "+X / -Y" rating change shown beside a card after a pick. dx/dy are the
// resting offset (px); key forces React to remount and restart the animation when the
// same card scores again in Keep Winner mode.
type FloatDelta = { delta: number; dx: number; dy: number; key: number };

// Land the number in the white margin on the card's OUTER side (away from the other
// card) so it's readable off the card art, with a random vertical spread. dx clears
// the card's ~130px half-width; dy stays within its height so it reads alongside it.
// Winning-streak glow tiers, ascending. Each maps a streak threshold to its glow color
// (an "R G B" triple). Single source of truth for both the card glow and the legend.
const STREAK_TIERS = [
  { streak: 5, color: "220 38 38" }, // red
  { streak: 10, color: "249 115 22" }, // orange
  { streak: 20, color: "37 99 235" }, // blue
  { streak: 40, color: "139 92 246" }, // violet
];

// Highest tier the streak has reached → its glow color; null below the first tier.
function flameColor(streak: number): string | null {
  let color: string | null = null;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.streak) color = tier.color;
  }
  return color;
}

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
    const res = await fetch(`/api/comparison/next?playerId=${playerId}`);
    const { cards: next } = (await res.json()) as { cards: Card[] };

    // Clear the outgoing cards first so the new pair mounts below the screen
    // without the old (now off-screen-above) cards re-rendering at center.
    setPickedId(null);
    setHoveredId(null);
    setCards(null);
    setPos({});
    setFloats({}); // a fresh pair carries no rating floats from the previous round
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
      `/api/comparison/next?playerId=${playerId}&winnerId=${winner.card_id}`,
    );
    const { cards: next } = (await res.json()) as { cards: Card[] };
    const fresh = next.find((card) => card.card_id !== winner.card_id)!;

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

  return (
    <div className="flex flex-1 flex-col bg-white relative overflow-hidden">
      {/* Minimal streak legend: which glow color maps to which win streak. Centered on the
          15%-from-top line (i.e. 85% up this card area, which excludes the nav banner above
          it) and 15% in from the left. Colors come from STREAK_TIERS (single source). */}
      <ul className="absolute left-[15%] top-[15%] z-20 flex -translate-y-1/2 flex-col gap-2 select-none">
        {STREAK_TIERS.map((tier) => (
          <li key={tier.streak} className="flex items-center gap-2 text-xs text-neutral-500">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: `rgb(${tier.color})`,
                boxShadow: `0 0 6px 1px rgb(${tier.color} / 0.7)`,
              }}
            />
            <span className="tabular-nums">{tier.streak}+</span>
          </li>
        ))}
      </ul>

      {/* Filter button removed for now (see TODO: rarity-restricted comparison
          pool). Keep Winner stays right-aligned on its own. */}
      <div className="flex justify-end px-6 py-4">
        <label className="flex cursor-pointer select-none items-center gap-3">
          <span className="font-semibold text-neutral-800">Keep Winner</span>
          <button
            type="button"
            role="switch"
            aria-checked={keepWinner}
            onClick={() => setKeepWinner((on) => !on)}
            className={[
              "relative h-7 w-12 rounded-full transition-colors duration-200",
              keepWinner ? "bg-red-600" : "bg-neutral-300",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-200",
                keepWinner ? "translate-x-5" : "",
              ].join(" ")}
            />
          </button>
        </label>
      </div>

      {/* gap-8 is the mobile spacing (looks right on iPhone); lg:gap-24 triples it
          (2rem -> 6rem) on laptop/desktop widths only, leaving phones unchanged. */}
      <div className="flex flex-1 items-center justify-center gap-8 lg:gap-16 pb-40 relative z-10">
        {cards?.map((card) => {
          const isPicked = pickedId === card.card_id;
          const isHovered = hoveredId === card.card_id && ready;
          const float = floats[card.card_id];
          // Streak glow only on the card the streak belongs to (the held winner).
          const flame = card.card_id === streakCardId ? flameColor(streak) : null;

          return (
            // Wrapper stays put (the button's slide is a transform, which doesn't
            // affect layout), so the float anchored here stays in the white margin
            // while the card slides away instead of riding off-screen with it.
            <div key={card.card_id} className="relative">
              <button
                onClick={() => handlePick(card)}
                onMouseEnter={() => setHoveredId(card.card_id)}
                onMouseLeave={() => setHoveredId(null)}
                className={[
                  "relative rounded-xl transition-all duration-500 ease-out",
                  POSITION_CLASS[pos[card.card_id] ?? "below"],
                  isHovered ? "scale-110" : "scale-100",
                  isHovered ? "shadow-[0_0_40px_12px_rgba(0,0,0,0.25)]" : "",
                  isPicked ? "shadow-[0_0_40px_12px_rgba(34,197,94,0.9)]" : "",
                ].join(" ")}
              >
                {/* Streak glow: a colored backing + halo behind the card (z-0). The
                    fill colors the immediate backdrop right up to the border, and the
                    box-shadow glows outward; the tier color escalates with the streak. */}
                {flame && (
                  <span
                    aria-hidden
                    className="flame pointer-events-none absolute z-0"
                    style={{ "--flame-color": flame } as React.CSSProperties}
                  />
                )}
                <Image
                  src={card.image_url}
                  alt={card.name}
                  width={325}
                  height={450}
                  className="relative z-10 rounded-xl"
                  priority
                />
              </button>

              {/* Rating change floating off the card into the white margin. Outer span
                  pins to the card centre; inner span runs the drift-and-fade (its own
                  transform), so re-mounting via `key` restarts a fresh drift each pick. */}
              {float && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
                  <span
                    key={float.key}
                    onAnimationEnd={() => clearFloat(card.card_id)}
                    style={
                      {
                        "--float-x": `${float.dx}px`,
                        "--float-y": `${float.dy}px`,
                        fontFamily: "var(--font-elo)", // Bitcount Prop Single (see layout.tsx)
                      } as React.CSSProperties
                    }
                    className={[
                      "elo-float block text-4xl font-bold tabular-nums",
                      "drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
                      float.delta > 0 ? "text-green-500" : "text-red-500",
                    ].join(" ")}
                  >
                    {float.delta > 0 ? `+${float.delta}` : float.delta}
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
