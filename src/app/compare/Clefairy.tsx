"use client";

import { useEffect, useRef, useState } from "react";

// A relaxed toddle, in px/s. Walk duration scales with distance so speed stays constant.
const WALK_SPEED = 55;

// How far (px) the wanderer may stray from the center of the board. Recomputed per walk
// (so a window resize is picked up on the next wander) and capped so it stays roughly
// within the comparison area rather than under the side panels.
function roamRange(): number {
  if (typeof window === "undefined") return 200;
  return Math.min(window.innerWidth * 0.3, 420);
}

type Emote = "none" | "hop" | "wiggle";

// Grey-outline eyes: open dots, or brief closed lines mid-blink.
function ClefairySvg({ blink }: { blink: boolean }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* ears */}
      <path
        d="M20 21 Q15 11 11 6 Q19 8 24 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M36 21 Q41 11 45 6 Q37 8 32 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* forehead curl */}
      <path
        d="M25 18 Q26 12 32 13 Q28 14.5 28.5 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* round body */}
      <circle cx="28" cy="32" r="15" stroke="currentColor" strokeWidth="2" />
      {/* stubby arms */}
      <path d="M13.5 32 Q9 34 12 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M42.5 32 Q47 34 44 38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* feet */}
      <path d="M21 46.5 Q20 50.5 25.5 49.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M35 46.5 Q36 50.5 30.5 49.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* eyes: dots open, lines mid-blink */}
      {blink ? (
        <>
          <path d="M21.5 29.5 H25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M31 29.5 H34.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="23" cy="29.5" r="1.7" fill="currentColor" />
          <circle cx="33" cy="29.5" r="1.7" fill="currentColor" />
        </>
      )}
      {/* mouth */}
      <path d="M25 35 Q28 38 31 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// A minimalist grey-outline Clefairy that keeps the player company at the bottom of the
// board. A single self-rescheduling timer is its "brain": it walks to a random spot at a
// constant toddle (waddling as it goes), stands around, glances the other way, blinks,
// and mixes in little hop/wiggle emotes — with randomized pauses so the rhythm feels
// natural, not metronomic. It also hops on every pick (the `picks`-keyed wrapper, kept
// separate from the wander emote so the two one-shot animations can't cancel each
// other). Purely decorative: aria-hidden, no pointer events.
export default function Clefairy({ picks }: { picks: number }) {
  const [x, setX] = useState(0);
  const [walkMs, setWalkMs] = useState(0);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [emote, setEmote] = useState<Emote>("none");
  const [emoteKey, setEmoteKey] = useState(0);
  const [blink, setBlink] = useState(false);
  // Current wander target, readable inside the timer loop without re-running the effect.
  const xRef = useRef(0);

  // The wander brain. Rough action weights: walk 45%, emote 25%, glance 10%, stand 20%.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let arrival: ReturnType<typeof setTimeout>;
    function schedule(delay: number) {
      timer = setTimeout(act, delay);
    }
    function act() {
      const roll = Math.random();
      if (roll < 0.45) {
        const target = (Math.random() * 2 - 1) * roamRange();
        const ms = Math.max(500, (Math.abs(target - xRef.current) / WALK_SPEED) * 1000);
        setFacing(target >= xRef.current ? 1 : -1);
        xRef.current = target;
        setX(target);
        setWalkMs(ms);
        setWalking(true);
        arrival = setTimeout(() => setWalking(false), ms);
        schedule(ms + 400 + Math.random() * 1600); // arrive, then take a breath
      } else if (roll < 0.7) {
        setEmote(roll < 0.575 ? "hop" : "wiggle");
        setEmoteKey((k) => k + 1);
        schedule(900 + Math.random() * 1100);
      } else if (roll < 0.8) {
        setFacing((f) => (f === 1 ? -1 : 1)); // glance the other way
        schedule(700 + Math.random() * 1000);
      } else {
        schedule(1600 + Math.random() * 2600); // just stand there, being round
      }
    }
    schedule(1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(arrival);
    };
  }, []);

  // Blink every few seconds, on its own clock so it can land mid-walk or mid-stand.
  useEffect(() => {
    let open: ReturnType<typeof setTimeout>;
    let close: ReturnType<typeof setTimeout>;
    function loop() {
      close = setTimeout(() => {
        setBlink(true);
        open = setTimeout(() => {
          setBlink(false);
          loop();
        }, 160);
      }, 2500 + Math.random() * 3500);
    }
    loop();
    return () => {
      clearTimeout(open);
      clearTimeout(close);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute bottom-6 left-1/2 z-20">
      {/* wander positioner: glides to the target at a constant toddle */}
      <div
        style={{
          transform: `translateX(${x}px)`,
          transition: `transform ${walkMs}ms ease-in-out`,
        }}
      >
        {/* facing flip (instant), separate from the glide so the transforms don't fight */}
        <div style={{ transform: `scaleX(${facing})` }}>
          {/* pick celebration: remounts (and so replays) on every pick */}
          <div key={picks} className={picks > 0 ? "critter-hop" : ""}>
            {/* wander emote: its own one-shot layer, restarted by remount */}
            <div
              key={emoteKey}
              className={
                emote === "hop" ? "critter-hop" : emote === "wiggle" ? "wiggle" : ""
              }
            >
              <div className={walking ? "clefairy-waddle" : "critter-idle"}>
                <div className="text-neutral-400">
                  <ClefairySvg blink={blink} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
