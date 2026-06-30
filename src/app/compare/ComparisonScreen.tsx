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
// Winning-streak flame tier. `rgb` (an "R G B" triple) colors the surrounding glow;
// `gradId` selects one of the three pre-defined vertical gradients (FLAME_GRADIENTS)
// that fill the flame tongues — escalating with the streak, null below the first tier.
type FlameTier = { rgb: string; gradId: string };
function flameTier(streak: number): FlameTier | null {
  if (streak >= 20) return { rgb: "147 51 234", gradId: "flame-grad-purple" };
  if (streak >= 10) return { rgb: "37 99 235", gradId: "flame-grad-blue" };
  if (streak >= 5) return { rgb: "153 27 27", gradId: "flame-grad-red" };
  return null;
}

// The three tier gradients, rendered once into a hidden <svg defs>. Each fades a bright
// hot base → the tier color → transparent tip (y1=1 bottom, y2=0 top), so a flat-filled
// path reads as a glowing flame without any per-element/per-frame filter work.
const FLAME_GRADIENTS = [
  { id: "flame-grad-red", base: "234 88 88", mid: "153 27 27" },
  { id: "flame-grad-blue", base: "96 165 250", mid: "37 99 235" },
  { id: "flame-grad-purple", base: "192 132 252", mid: "147 51 234" },
];

// Flame tongues, all pointing UP, ringing the whole card. `left`/`top` anchor the base
// (%); top-edge tongues rise above the card, side tongues climb the edges, bottom
// tongues (top > 100%) rise from beneath. `scale` varies each tongue's size for an
// uneven, organic ring. The flame layer sits behind the card, so the inner halves tuck
// out of sight and only the outward-licking flames show.
type Tongue = { left: string; top: string; scale: number };
const FLAME_TONGUES: Tongue[] = [
  { left: "8%", top: "0%", scale: 1.05 }, // top edge (tallest — the crown)
  { left: "22%", top: "0%", scale: 1.2 },
  { left: "36%", top: "0%", scale: 1.0 },
  { left: "50%", top: "0%", scale: 1.25 },
  { left: "64%", top: "0%", scale: 1.0 },
  { left: "78%", top: "0%", scale: 1.2 },
  { left: "92%", top: "0%", scale: 1.05 },
  { left: "0%", top: "20%", scale: 0.85 }, // left edge (climbing)
  { left: "0%", top: "42%", scale: 0.95 },
  { left: "0%", top: "64%", scale: 0.9 },
  { left: "0%", top: "85%", scale: 0.85 },
  { left: "100%", top: "20%", scale: 0.85 }, // right edge (climbing)
  { left: "100%", top: "42%", scale: 0.95 },
  { left: "100%", top: "64%", scale: 0.9 },
  { left: "100%", top: "85%", scale: 0.85 },
  { left: "18%", top: "108%", scale: 0.95 }, // bottom edge (rising from beneath)
  { left: "41%", top: "110%", scale: 1.0 },
  { left: "59%", top: "110%", scale: 1.0 },
  { left: "82%", top: "108%", scale: 0.95 },
];

// One flame-tongue path in a 30×70 viewBox: a wide rooted base (x≈6–24 at y=70) tapering
// through a wavy S-curve to a single point at the top (y=0). The gradient fill gives it
// depth, so a single path per tongue (no stacked layers) keeps the node count low.
const FLAME_PATH =
  "M6 70 C3 52 6 30 12 14 C14 8 12 4 15 0 C18 4 16 8 18 14 C24 30 27 52 24 70 Z";

function randomFloat(delta: number, side: "left" | "right"): FloatDelta {
  const outward = side === "left" ? -1 : 1;
  return {
    delta,
    dx: outward * (188 + Math.random() * 80), // 188–268px to the outer side (min +25%)
    dy: (Math.random() - 0.5) * 200, // ±100px vertical spread
    key: Math.random(),
  };
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

  // Load the first pair on mount. loadNextPair is async and only calls setState
  // *after* `await fetch`, so there is no synchronous render cascade here — but the
  // lint rule can't see through the async boundary, hence the targeted disable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNextPair();
  }, [loadNextPair]);

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
      {/* Streak-flame tier gradients, defined once. Fixed colors (not CSS vars) let one
          shared <defs> fill every tongue without per-element gradients. */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          {FLAME_GRADIENTS.map((g) => (
            <linearGradient key={g.id} id={g.id} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={`rgb(${g.base})`} stopOpacity="1" />
              <stop offset="0.5" stopColor={`rgb(${g.mid})`} stopOpacity="0.85" />
              <stop offset="1" stopColor={`rgb(${g.mid})`} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
      </svg>

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
          // Streak flame only on the card the streak belongs to (the held winner).
          const flame = card.card_id === streakCardId ? flameTier(streak) : null;

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
                {/* Streak flame: a colored glow wrapping the whole card edge plus a ring
                    of upward-licking SVG flame tongues around the card. Sits behind the
                    card (z-0) so each tongue's inner half tucks out of sight. Color/tier
                    escalates with the streak via --flame-color + the gradient id. Only
                    transform/opacity animate (see globals.css) to stay GPU-cheap. */}
                {flame && (
                  <span
                    aria-hidden
                    className="flame pointer-events-none absolute inset-0 z-0"
                    style={{ "--flame-color": flame.rgb } as React.CSSProperties}
                  >
                    <span className="flame-glow" />
                    {FLAME_TONGUES.map((tongue, i) => (
                      <span
                        key={i}
                        className="flame-tongue"
                        style={
                          {
                            left: tongue.left,
                            top: tongue.top,
                            "--s": tongue.scale,
                          } as React.CSSProperties
                        }
                      >
                        <svg
                          viewBox="0 0 30 70"
                          className="flame-tongue-svg"
                          // Desync + vary each tongue so the ring flickers organically.
                          style={{
                            animationDelay: `${-(i * 0.13)}s`,
                            animationDuration: `${1.15 + (i % 4) * 0.22}s`,
                          }}
                        >
                          <path d={FLAME_PATH} fill={`url(#${flame.gradId})`} />
                        </svg>
                      </span>
                    ))}
                  </span>
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
