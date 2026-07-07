"use client";

import { useEffect, useState } from "react";

// The animated PokeMash wordmark: types the whole name in black with a caret,
// pauses, erases "Mash", and retypes it in brand red — then the caret fades.
// The vignette replays from a blank line every CYCLE_MS.
const NAME = "PokeMash";
// Where "Mash" starts: everything from here is erased and retyped in red.
const RED_FROM = NAME.indexOf("Mash");

const TYPE_MS = 90;
const ERASE_MS = 55;
const CYCLE_MS = 30_000;

// One rendered frame: how many letters are shown, and whether the "Mash" half has
// been retyped red yet (false during the first all-black pass and the erase).
type Frame = { shown: number; mashRed: boolean };

// The keystroke script, as frames with the delay to wait BEFORE showing each:
// type everything black → pause → backspace through "Mash" → beat → retype it red.
// Deterministic, so it's built once at module scope.
const SCRIPT: { frame: Frame; delay: number }[] = (() => {
  const steps: { frame: Frame; delay: number }[] = [];
  for (let i = 1; i <= NAME.length; i++) {
    steps.push({ frame: { shown: i, mashRed: false }, delay: TYPE_MS });
  }
  steps.push({ frame: { shown: NAME.length, mashRed: false }, delay: 700 });
  for (let i = NAME.length - 1; i >= RED_FROM; i--) {
    steps.push({ frame: { shown: i, mashRed: false }, delay: ERASE_MS });
  }
  steps.push({ frame: { shown: RED_FROM, mashRed: false }, delay: 350 });
  for (let i = RED_FROM + 1; i <= NAME.length; i++) {
    steps.push({ frame: { shown: i, mashRed: true }, delay: TYPE_MS });
  }
  return steps;
})();

export default function LogoWordmark() {
  // Starts empty on the server and types in after hydration, so SSR and the
  // hydration pass render the same blank frame.
  const [frame, setFrame] = useState<Frame>({ shown: 0, mashRed: false });
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Reduced motion: skip the theater, show the finished wordmark, no replays.
    // Scheduled (not set synchronously) so the effect never cascades renders.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timers.push(
        setTimeout(() => {
          setFrame({ shown: NAME.length, mashRed: true });
          setDone(true);
        }, 0),
      );
      return () => timers.forEach(clearTimeout);
    }
    // One full playthrough: blank the line (caret back on), then run the script.
    // Every timer of the previous cycle has fired by the next one (the script is
    // a few seconds, the cycle 30), so resetting the pool is just hygiene.
    function play() {
      timers.forEach(clearTimeout);
      timers.length = 0;
      timers.push(
        setTimeout(() => {
          setFrame({ shown: 0, mashRed: false });
          setDone(false);
        }, 0),
      );
      let at = 400; // beat on the blank line before the first keystroke
      for (const step of SCRIPT) {
        at += step.delay;
        timers.push(setTimeout(() => setFrame(step.frame), at));
      }
      // Let the caret linger a moment on the finished name, then fade it out.
      timers.push(setTimeout(() => setDone(true), at + 1200));
    }
    play();
    const cycle = setInterval(play, CYCLE_MS);
    return () => {
      clearInterval(cycle);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    // aria-hidden: the wrapping <Link> carries the accessible "PokeMash" name, so
    // screen readers aren't fed the letter-by-letter churn.
    // No font-bold/tracking-tight: DotGothic16 has a single 400 weight, and both
    // synthetic bolding and negative tracking smear its dot glyphs into each other.
    <span aria-hidden className="flex select-none items-baseline text-2xl">
      {NAME.slice(0, frame.shown)
        .split("")
        .map((ch, i) => (
          <span
            key={i}
            className={i >= RED_FROM && frame.mashRed ? "text-red-600" : "text-neutral-900"}
          >
            {ch}
          </span>
        ))}
      <span
        className={[
          "logo-caret ml-0.5 h-[1.05em] w-[2px] self-center rounded-full bg-neutral-400",
          "transition-opacity duration-500",
          done ? "!opacity-0" : "",
        ].join(" ")}
      />
    </span>
  );
}
