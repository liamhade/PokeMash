"use client";

import { useEffect, useState } from "react";

// The animated PokeMash wordmark: on each load it types the name out with a caret,
// pauses, backspaces to one randomly chosen letter, and retypes it in the flipped
// brand color (a "Poke" letter comes back red, a "Mash" letter comes back dark) —
// a small typo-correction vignette that lands differently every visit. Once done,
// the caret blinks a moment longer and fades.
const NAME = "PokeMash";
// First index of the red half of the base scheme ("Poke" dark / "Mash" red, echoing
// the old raster logo's colors).
const RED_FROM = NAME.indexOf("Mash");

const TYPE_MS = 90;
const ERASE_MS = 55;

// One rendered frame of the animation: how many letters are shown, and whether the
// accent letter has been retyped yet (before that it wears its base color).
type Frame = { shown: number; accented: boolean };

// The full keystroke script for a given accent letter, as frames with the delay to
// wait BEFORE showing each. Type everything → pause → backspace to the accent
// letter → beat → retype it (accented) and the letters after it.
function buildScript(accentIdx: number): { frame: Frame; delay: number }[] {
  const steps: { frame: Frame; delay: number }[] = [];
  for (let i = 1; i <= NAME.length; i++) {
    steps.push({ frame: { shown: i, accented: false }, delay: TYPE_MS });
  }
  steps.push({ frame: { shown: NAME.length, accented: false }, delay: 700 });
  for (let i = NAME.length - 1; i >= accentIdx; i--) {
    steps.push({ frame: { shown: i, accented: false }, delay: ERASE_MS });
  }
  steps.push({ frame: { shown: accentIdx, accented: false }, delay: 350 });
  for (let i = accentIdx + 1; i <= NAME.length; i++) {
    steps.push({ frame: { shown: i, accented: true }, delay: TYPE_MS });
  }
  return steps;
}

export default function LogoWordmark() {
  // Starts empty on the server and types in after hydration; the accent letter is
  // only chosen client-side (in the effect) so SSR and hydration render the same
  // empty frame.
  const [frame, setFrame] = useState<Frame>({ shown: 0, accented: false });
  const [accentIdx, setAccentIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Reduced motion: skip the theater, show the finished wordmark.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFrame({ shown: NAME.length, accented: false });
      setDone(true);
      return;
    }
    const accent = Math.floor(Math.random() * NAME.length);
    setAccentIdx(accent);
    const script = buildScript(accent);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 400; // beat after load before the first keystroke
    for (const step of script) {
      at += step.delay;
      timers.push(setTimeout(() => setFrame(step.frame), at));
    }
    // Let the caret linger a moment on the finished name, then fade it out.
    timers.push(setTimeout(() => setDone(true), at + 1200));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    // aria-hidden: the wrapping <Link> carries the accessible "PokeMash" name, so
    // screen readers aren't fed the letter-by-letter churn.
    <span aria-hidden className="flex select-none items-baseline text-2xl font-bold tracking-tight">
      {NAME.slice(0, frame.shown)
        .split("")
        .map((ch, i) => {
          const baseRed = i >= RED_FROM;
          // The retyped letter wears the OTHER half's color.
          const red = frame.accented && i === accentIdx ? !baseRed : baseRed;
          return (
            <span key={i} className={red ? "text-red-600" : "text-neutral-900"}>
              {ch}
            </span>
          );
        })}
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
