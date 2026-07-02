"use client";

import { useEffect, useRef, useState } from "react";

// A relaxed toddle, in px/s. Walk duration scales with distance so speed stays constant.
const WALK_SPEED = 55;

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

// Back view, derived from SPRITE (same silhouette so the flip/waddle layers work
// unchanged): every front detail — eyes, mouth, the forehead swirl, claw greys,
// cream highlights — flattened to body pink with the right-edge shading kept, plus
// a best-guess pair of small brown wings low on her back, Game Boy back-sprite style.
const BACK_SPRITE = [
  "..................MMMM...................",
  "................DDPPPPMM.................",
  ".....bbbbb.....DPPPPPPPPM.......bbbbee...",
  "....ebttttbDD.MPPPPPPPPPPM...eebttttbbe..",
  "....ebbttePPPDMPPPPPPPPPPMDDDPbttttbbek..",
  "....eebbecPPPPPPPPPPPPPPPPPPcPPbttbbekk..",
  "....eebbecPPPPPPPPPPPPPPPPPPPPPPbbbekke..",
  "....eeeedPPPPPPPPPPPPPPPPPPPPPPdbbekkke..",
  ".....eeeddPPPPPPPPPPPPPPPPPPPddddekkkke..",
  ".....eeeddDPPPPPPPPPPPPPPPPPddDdMkkkkk...",
  ".....eeddDPPPPPPPPPPPPPPPPPPPddDkkkkke...",
  "......MPPPPPPPPPPPPPPPPPPPPPPPPPPPPddeMM.",
  "......MMPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPdDM",
  "..d....MPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPdDk",
  ".dPd..MdPPPPPPPPPPPPPPPPPPPPPPPPPPPPPdDk.",
  ".MPDMMMPPPPPPPPPPPPPPPPPPPPPPPPPPPPPddk..",
  "MPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPddM..",
  "MPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPdDM.",
  "MPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPdDM",
  ".MdPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPdDk",
  "..kPPPPPPPPPPPPPkkPPPkkPPPPPPPPPPPPPddMk.",
  "...kPPPPPPPPPPkbbkPPPkbbkPPPPPPPPPPPddM..",
  "....kPPPPPPPkbttbkPPPkbttbkPPPPPPPPPddM..",
  ".....kPPPPPkbttbkPPPPPkbttbkPPDPddddkPPM.",
  ".....MdPPPPkbbkPPPPPPPPPkbbkPPPPdddkDPPM.",
  ".....MdPPPPPkkPPPPPPPPPPPkkPPPPddddkDPPM.",
  ".....MddPPPPPPPPPPPPPPPPPPPPPPdddddkDPPM.",
  "......MddPPPPPPPPPPPPPPPPPPPPddddddkdPPM.",
  "......MdddPPPPPPPPPPPPPPPPPPddddddkMdPM..",
  "......MdddddPPPPPPPPPPPPPPddddddddkdddM..",
  ".......MddddddPPPPPPPPPdddddddddddkdddM..",
  ".......MdddddddddddddddddddddddddkdddM...",
  "........MdddMMdddddddddddddddddddkddM....",
  "........MdddddMMMdddddddddddddddkdMM.....",
  ".........MdddddddMMMMMDdddddddddkM.......",
  "..........Mddddddk....Mddddddddk.........",
  "..........dddddkk......Mdddddddk.........",
  "...........kkkk.........Mdddddk..........",
  ".........................kkkkk...........",
];

// Drawing size of one sprite pixel; the svg is displayed at DISPLAY_SCALE of that
// (rects stay on integer coordinates, the browser scales the whole vector down).
const PX = 2;
const DISPLAY_SCALE = 0.75;

// Rendered sprite footprint, for keeping walk targets inside the roam area.
const SPRITE_W = SPRITE[0].length * PX * DISPLAY_SCALE;
const SPRITE_H = SPRITE.length * PX * DISPLAY_SCALE;

// A walk whose vertical component exceeds this reads as "moving up/down the screen":
// Clefairy turns around (into the page, back to the viewer) for those treks.
const BACK_DY = 24;

function ClefairySprite({ blink, back }: { blink: boolean; back: boolean }) {
  const rows = back ? BACK_SPRITE : blink ? BLINK_SPRITE : SPRITE;
  const w = SPRITE[0].length * PX;
  const h = SPRITE.length * PX;
  return (
    <svg
      width={w * DISPLAY_SCALE}
      height={h * DISPLAY_SCALE}
      viewBox={`0 0 ${w} ${h}`}
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

// A pixel-art Clefairy that keeps the player company, roaming the whole play area
// (everything under the nav). A single self-rescheduling timer is its "brain": it
// walks to random spots — turning its back to the viewer for vertical treks — sneaks
// behind the card block to peek past its edge, occasionally strolls off the left
// edge and reappears from the right, stands around, glances or turns around, blinks,
// and mixes in little hop/wiggle emotes with randomized pauses so the rhythm feels
// natural, not metronomic. It also hops on every pick (the `picks`-keyed wrapper,
// kept separate from the wander emote so the two one-shot animations can't cancel
// each other). Purely decorative: aria-hidden, no pointer events, and the roam layer
// sits at z-0 UNDER the board (z-10) so she passes behind the cards.
export default function Clefairy({ picks }: { picks: number }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [walkMs, setWalkMs] = useState(0);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [showBack, setShowBack] = useState(false);
  const [emote, setEmote] = useState<Emote>("none");
  const [emoteKey, setEmoteKey] = useState(0);
  const [blink, setBlink] = useState(false);
  // Current position/orientation, readable inside the timer loop without re-running
  // the effect (the loop's closure would only ever see the initial state).
  const xRef = useRef(0);
  const yRef = useRef(0);
  const facingRef = useRef<1 | -1>(1);
  const backRef = useRef(false);
  // The roam area (the whole play screen minus the nav); measured per walk so a
  // window resize is picked up on the next wander.
  const areaRef = useRef<HTMLDivElement | null>(null);

  // The wander brain. Rough action weights: wander 40%, peek 10%, wrap 8%,
  // emote 17%, glance/turn-around 10%, stand 15%.
  useEffect(() => {
    // The wrap stroll chains several timeouts, so track them as a pool rather
    // than one named handle each.
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function after(delay: number, fn: () => void) {
      const t = setTimeout(() => {
        timers.delete(t);
        fn();
      }, delay);
      timers.add(t);
    }
    function schedule(delay: number) {
      after(delay, act);
    }
    function area() {
      const el = areaRef.current;
      return { w: el?.clientWidth ?? 800, h: el?.clientHeight ?? 400 };
    }

    // Walk to (tx, ty): look where you're going first — face the target, turning
    // around (back view) when the trek is vertical, with a longer beat when the
    // orientation actually changes — then glide there at the constant toddle.
    // Returns the full look+walk duration so callers can schedule past it.
    function walkTo(tx: number, ty: number, onArrive?: () => void): number {
      const dx = tx - xRef.current;
      const dy = ty - yRef.current;
      const ms = Math.max(500, (Math.hypot(dx, dy) / WALK_SPEED) * 1000);
      const dir: 1 | -1 = dx >= 0 ? 1 : -1;
      const back = Math.abs(dy) > BACK_DY;
      const turning = dir !== facingRef.current || back !== backRef.current;
      const lookMs = turning ? 300 + Math.random() * 350 : 150;
      if (Math.abs(dx) > 8) {
        facingRef.current = dir;
        setFacing(dir);
      }
      backRef.current = back;
      setShowBack(back);
      after(lookMs, () => {
        xRef.current = tx;
        yRef.current = ty;
        setX(tx);
        setY(ty);
        setWalkMs(ms);
        setWalking(true);
        after(ms, () => {
          setWalking(false);
          if (back) {
            // Arrived: turn back around to face the viewer.
            backRef.current = false;
            setShowBack(false);
          }
          onArrive?.();
        });
      });
      return lookMs + ms;
    }

    function act() {
      const { w, h } = area();
      // Walkable box, in offsets from the bottom-center anchor: x spans the full
      // width (sprite kept inside by a small margin), y from the floor up to just
      // under the top of the play area.
      const xMin = -w / 2 + 16;
      const xMax = w / 2 - SPRITE_W - 16;
      const yMin = Math.min(0, -(h - SPRITE_H - 120));
      const roll = Math.random();
      if (roll < 0.4) {
        // Wander anywhere in the play area.
        const tx = xMin + Math.random() * (xMax - xMin);
        const ty = yMin * Math.random();
        schedule(walkTo(tx, ty) + 400 + Math.random() * 1600);
      } else if (roll < 0.5) {
        // Sneak up behind the card block and peek out past one of its edges:
        // the target centers her on the block's edge at card height, so the
        // cards (z-10, above this layer) hide half of her.
        const side = Math.random() < 0.5 ? -1 : 1;
        const span = Math.min(w * 0.45, 380); // ~half the two-card block's width
        const tx = side * span - SPRITE_W / 2;
        const ty = yMin * (0.45 + Math.random() * 0.25); // the cards' vertical band
        schedule(walkTo(tx, ty) + 1200 + Math.random() * 2200); // hold the peek
      } else if (roll < 0.58) {
        // Stroll off the left edge and reappear from the right: walk fully out,
        // snap (walkMs 0 = no transition) to just past the right edge while
        // hidden, then keep walking left back into view.
        const offLeft = -w / 2 - SPRITE_W - 20;
        const reentry = xMax - Math.random() * w * 0.25;
        const leg1 = walkTo(offLeft, yRef.current, () => {
          setWalkMs(0);
          xRef.current = w / 2 + 20;
          setX(xRef.current);
          after(60, () => walkTo(reentry, yRef.current));
        });
        // Upper bound for leg 2 (its walkTo hasn't run yet): snap beat + max
        // look pause + the re-entry glide.
        const leg2 = 60 + 650 + (Math.abs(w / 2 + 20 - reentry) / WALK_SPEED) * 1000;
        schedule(leg1 + leg2 + 400 + Math.random() * 1200);
      } else if (roll < 0.75) {
        setEmote(roll < 0.665 ? "hop" : "wiggle");
        setEmoteKey((k) => k + 1);
        schedule(900 + Math.random() * 1100);
      } else if (roll < 0.85) {
        if (Math.random() < 0.5) {
          facingRef.current = facingRef.current === 1 ? -1 : 1; // glance the other way
          setFacing(facingRef.current);
        } else {
          backRef.current = !backRef.current; // turn around on the spot
          setShowBack(backRef.current);
        }
        schedule(700 + Math.random() * 1000);
      } else {
        schedule(1600 + Math.random() * 2600); // just stand there, being round
      }
    }
    schedule(1500);
    return () => timers.forEach((t) => clearTimeout(t));
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
    // Full-bleed roam layer under the board; the parent's overflow-hidden clips
    // the sprite during the off-screen wrap walk.
    <div ref={areaRef} aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute bottom-6 left-1/2">
        {/* wander positioner: glides to the target at a constant toddle */}
        <div
          style={{
            transform: `translate(${x}px, ${y}px)`,
            transition: `transform ${walkMs}ms ease-in-out`,
          }}
        >
          {/* facing flip (instant), separate from the glide so the transforms don't fight.
              The sprite art natively faces LEFT, so facing=1 (moving right) mirrors it. */}
          <div style={{ transform: `scaleX(${-facing})` }}>
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
                  <ClefairySprite blink={blink} back={showBack} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
