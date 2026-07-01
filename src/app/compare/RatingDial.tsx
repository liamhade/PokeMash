"use client";

import { useEffect, useRef, useState } from "react";

// How long the dial spins from the old rating to the new one. Matches SLIDE_MS in
// ComparisonScreen so the number settles in step with the card motion.
const DIAL_MS = 350;
// How long the delta badge and green/red tint linger after the spin settles.
const HOLD_MS = 900;

// The "Rating" dial under a card: shows the card's current rating and, whenever the
// `value` prop changes (a pick), spins the displayed number through the intermediate
// values like an odometer — tinting green/red and popping a ▲/▼ delta badge while it
// moves. `from` seeds the start value on mount, for the exit overlay's dial, which
// mounts already mid-change (the departing loser's tick-down).
export default function RatingDial({ value, from }: { value: number; from?: number }) {
  const [shown, setShown] = useState(from ?? value);
  const [delta, setDelta] = useState(0);
  // Mirror of `shown` readable inside the effect without being a dependency (adding
  // `shown` would re-trigger the effect on every animation frame).
  const shownRef = useRef(from ?? value);

  useEffect(() => {
    const start = shownRef.current;
    if (start === value) return;
    setDelta(value - start);
    const t0 = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min((now - t0) / DIAL_MS, 1);
      const eased = 1 - (1 - t) ** 3; // ease-out: fast spin, slow settle
      const next = Math.round(start + (value - start) * eased);
      shownRef.current = next;
      setShown(next);
      if (t < 1) raf = requestAnimationFrame(step);
    });
    const hold = setTimeout(() => setDelta(0), DIAL_MS + HOLD_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(hold);
    };
  }, [value]);

  return (
    <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 flex -translate-x-1/2 items-baseline gap-2 whitespace-nowrap">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
        Rating
      </span>
      <span
        style={{ fontFamily: "var(--font-elo)" }} // Bitcount Prop Single (see layout.tsx)
        className={[
          "text-3xl font-bold tabular-nums transition-colors duration-300",
          delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-neutral-700",
        ].join(" ")}
      >
        {shown}
      </span>
      {delta !== 0 && (
        <span
          className={[
            "dial-pop text-sm font-bold tabular-nums",
            delta > 0 ? "text-green-500" : "text-red-500",
          ].join(" ")}
        >
          {delta > 0 ? `▲${delta}` : `▼${-delta}`}
        </span>
      )}
    </div>
  );
}
