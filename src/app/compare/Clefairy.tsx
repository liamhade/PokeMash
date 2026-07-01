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

// The sprite: one character per pixel, machine-extracted from the classic Clefairy
// pixel chart (grid-fitted, per-cell median color, quantized to the anchors below).
// Legend: . empty | k black | e/M dark shading maroons | b/t ear browns | P/p body
// pinks | d/D pink shades | c cream highlight | r mouth red | W white | g claw grey.
const SPRITE = [
  "..................MMMM...................",
  "................DDccccMM.................",
  ".....bbbbb.....DPPPPPPPPM.......bbbbee...",
  "....ebttttbDD.McPPPPPPPPPM...eebttttbbe..",
  "....ebbttePPcDMPPPPcccPPPMDDDPbttttbbek..",
  "....eebbecPPPMPPPcDMMdPPPPMPcPPbttbbekk..",
  "....eebbecPPPMPPPDPPcMdPPPDPPPPPbbbekke..",
  "....eeeedPPPcMPPPDPPPPMdPPPPPPPdbbekkke..",
  ".....eeeddPPPPMPPcPPPckdPPPPPddddekkkke..",
  ".....eeeddDPPPMPPPPPPpkdPPPPddDdMkkkkk...",
  ".....eeddDPPPPPMMccPckddPPPPPddDkkkkke...",
  "......MdMPPPPPPPdkkkkddPPPPPPdddMkkkkeMM.",
  "......MMdPPPPPPPPddddpPPPPPPPcdgdMkkkMDDM",
  "..g....MPPPPPDcPPPPPPcDPPPPPPcgWgdkkkDDDk",
  ".gWg..MdPPPPDPWPPPPPWPPDPPPPcMgWgdMkkDDk.",
  ".MWDMMMPPPPPMckPPPPPkPPMPPPPMPdPPgdkMDk..",
  "McccDPMMPPPPMPkPPPPPkPPMPPPPMdPPPWgMkMM..",
  "MDcPddPPPDDdPDgcppPPgcDPDDdMcPcPPdgMkDDM.",
  "MWgPPPPPPDDDccPkkkWkPcPPDDDPPPPPPMddkDDDM",
  ".MdPPPPPPPPPPPPPkrrrPPPPPPPPPPPPPMddkMDDk",
  "..kPpPPPPPPPPPPcrrrrcPPPPPPPPPPPMdddkPMk.",
  "...kPPPPPPPPPPPcPrrPPPPPPPPPPPPPMdddkPM..",
  "....kPPPPPPPPPPPPPPPPPPPPPPPPPPMPdddkPM..",
  ".....kPPPPPPPPPPPPPPPPPPPPPPPPDPddddkcPM.",
  ".....MdPPPPPPPPPPPPPPPPPPPPPPPPPdddkDPPM.",
  ".....MdPPPPPPPPPPPPPPPPPPPPPPPPddddkDPPM.",
  ".....MddccPPPPPPPPPPPPPPPPPPPPdddddkDPPM.",
  "......MddPPPPPPPPPPPPPPPPPPPcddddddkdPPM.",
  "......MdddcPcPPPPPPPPPPPcPcPddddddkMdPM..",
  "......MdddddPPPPPPPPPPPPPPddddddddkdddM..",
  ".......MddddddPPPPPPPPPdddddddddddkdddM..",
  ".......MdddddddddddddddddddddddddkdddM...",
  "........MdddMMdddddddddddddddddddkddM....",
  "........MdddddMMMdddddddddddddddkdMM.....",
  ".........MdddddddMMMMMDdddddddddkM.......",
  "..........Mgggdddk....Mddddddddk.........",
  "..........gWWWgkk......Mddgggddk.........",
  "...........kkkk.........MgWWWgk..........",
  ".........................kkkkk...........",
];

const PALETTE: Record<string, string> = {
  W: "#F8F8F8",
  p: "#F8C8B0",
  P: "#F8C8C8",
  d: "#F8B0B0",
  D: "#F88080",
  M: "#B05050",
  e: "#682020",
  k: "#101010",
  b: "#805038",
  t: "#988068",
  c: "#F8E0B0",
  r: "#D83828",
  g: "#989898",
};

// Mid-blink frame: the eyes are 1x2 black marks at cols 14/20, rows 15-16; dropping the
// top pixel of each (to body pink) leaves a 1px squint.
const BLINK_SPRITE = SPRITE.map((row, y) => {
  if (y !== 15) return row;
  const chars = [...row];
  chars[14] = "P";
  chars[20] = "P";
  return chars.join("");
});

// On-screen size of one sprite pixel — big enough that the pixels read as pixels.
const PX = 2;

function ClefairySprite({ blink }: { blink: boolean }) {
  const rows = blink ? BLINK_SPRITE : SPRITE;
  return (
    <svg
      width={rows[0].length * PX}
      height={rows.length * PX}
      shapeRendering="crispEdges"
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x * PX}
              y={y * PX}
              width={PX}
              height={PX}
              fill={PALETTE[ch]}
            />
          ),
        ),
      )}
    </svg>
  );
}

// A pixel-art Clefairy that keeps the player company at the bottom of the board. A
// single self-rescheduling timer is its "brain": it walks to a random spot at a
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
                <ClefairySprite blink={blink} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
