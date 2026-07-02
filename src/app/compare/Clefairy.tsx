"use client";

import { useEffect, useRef, useState } from "react";

// A relaxed toddle, in px/s. Walk duration scales with distance so speed stays constant.
const WALK_SPEED = 41;

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
// her curled tail drawn as a dark-outlined swirl on her rump (per the anime).
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
  ".MdPPPPPPPPPPMMMMPPPPPPPPPPPPPPPPPPPPPdDk",
  "..kPPPPPPPPMMPPPPMMPPPPPPPPPPPPPPPPPddMk.",
  "...kPPPPPPMPPMMMPPPMPPPPPPPPPPPPPPPPddM..",
  "....kPPPPMPPMPPPMPPPMPPPPPPPPPPPPPPPddM..",
  ".....kPPPMPPPMPPMPPPMPPPPPPPPPDPddddkPPM.",
  ".....MdPPMPPMPPMPPPPMPPPPPPPPPPPdddkDPPM.",
  ".....MdPPPMPPMMPPPPMPPPPPPPPPPPddddkDPPM.",
  ".....MddPPPMMPPPPMMPPPPPPPPPPPdddddkDPPM.",
  "......MddPPPPMMMMPPPPPPPPPPPPddddddkdPPM.",
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

// Peeking over the card's top edge: just her face (front rows through the mouth,
// arms stripped from the flanks, the cut closed with shading so the chin reads as
// dipping behind the edge) over two three-fingered hands hooked on the ledge. The
// card (z-10, above her layer) hides everything below its top border, so with the
// sprite's bottom pinned just under that border only the face and fingers show.
const PEEK_SPRITE = [
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
  ".......MdPPPPPPPPddddpPPPPPPPM...........",
  ".......MPPPPPDcPPPPPPcDPPPPPPM...........",
  ".......MPPPPDPWPPPPPWPPDPPPPcM...........",
  ".......MPPPPMckPPPPPkPPMPPPPMM...........",
  ".......MPPPPMPkPPPPPkPPMPPPPMM...........",
  ".......MPDDdPDgcppPPgcDPDDdMcPcPM........",
  ".......MPDDDccPkkkWkPcPPDDDPPPPPM........",
  ".......MPPPPPPPPkrrrPPPPPPPPPPPPM........",
  ".......MPPPPPPPcrrrrcPPPPPPPPPPPM........",
  ".......MddddddddddddddddddddddddM........",
  "..........kk.kk.kk......kk.kk.kk.........",
  ".........kPPkPPkPPk....kPPkPPkPPk........",
  ".........kddkddkddk....kddkddkddk........",
];

// A puzzled pixel "?" (cream fill, black outline) that pops up over her head
// when the player clicks her.
const QMARK = [
  ".kkkkkk.",
  "kkcccckk",
  "kcckkcck",
  "kcckkcck",
  "kkkkcckk",
  "..kcckk.",
  "..kcck..",
  "..kkkk..",
  "..kcck..",
  "..kcck..",
  "..kkkk..",
];

// Drawing size of one sprite pixel; the svg is displayed at DISPLAY_SCALE of that
// (rects stay on integer coordinates, the browser scales the whole vector down).
const PX = 2;
const DISPLAY_SCALE = 0.75;

// Rendered sprite footprint, for keeping walk targets inside the roam area.
const SPRITE_W = SPRITE[0].length * PX * DISPLAY_SCALE;
const SPRITE_H = SPRITE.length * PX * DISPLAY_SCALE;

// A walk whose vertical component exceeds this reads as "moving up the screen":
// Clefairy turns around (into the page, back to the viewer) for upward treks only —
// walking down she stays facing the viewer.
const BACK_DY = 24;

function PixelArt({ rows, scale }: { rows: string[]; scale: number }) {
  const w = rows[0].length * PX;
  const h = rows.length * PX;
  return (
    <svg
      width={w * scale}
      height={h * scale}
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
// walks to random spots — turning its back to the viewer for upward treks — strolls
// off the left edge to reappear from the right, stands around, glances, blinks, and
// mixes in little hop/wiggle emotes with randomized pauses so the rhythm feels
// natural, not metronomic. Whenever a wander path crosses a card, she ducks behind
// it and peeks over its top edge — face and fingers only — for a second or three.
// She also hops on every pick (the `picks`-keyed wrapper, kept separate from the
// wander emote so the two one-shot animations can't cancel each other). The roam
// layer itself takes no pointer events; instead a click listener on the play screen
// sends her walking to the clicked spot, or pops a puzzled "?" over her head when
// the click lands on her. She stays aria-hidden: decorative either way. The layer
// sits at z-0 UNDER the board (z-10) so she passes behind the cards.
export default function Clefairy({ picks }: { picks: number }) {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [walkMs, setWalkMs] = useState(0);
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [showBack, setShowBack] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [emote, setEmote] = useState<Emote>("none");
  const [emoteKey, setEmoteKey] = useState(0);
  const [blink, setBlink] = useState(false);
  // The "?" popup: `qmark` keys the pop-in animation so every click replays it.
  const [qmark, setQmark] = useState(0);
  const [showQmark, setShowQmark] = useState(false);
  // Current position/orientation, readable inside the timer loop without re-running
  // the effect (the loop's closure would only ever see the initial state).
  const xRef = useRef(0);
  const yRef = useRef(0);
  const facingRef = useRef<1 | -1>(1);
  const backRef = useRef(false);
  // The roam area (the whole play screen minus the nav); measured per walk so a
  // window resize is picked up on the next wander.
  const areaRef = useRef<HTMLDivElement | null>(null);
  // Her on-screen box (transforms applied), for hit-testing clicks against her.
  const spriteBoxRef = useRef<HTMLDivElement | null>(null);
  // The gliding positioner div, for reading her live mid-walk position when a
  // new walk interrupts one in flight.
  const posRef = useRef<HTMLDivElement | null>(null);

  // The wander brain. Rough action weights: wander 50% (detouring into a peek when
  // the path crosses a card), wrap 8%, emote 17%, glance 10%, stand 15%.
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
    // Walkable box, in offsets from the bottom-center anchor: x spans the full
    // width (sprite kept inside by a small margin), y from the floor up to just
    // under the top of the play area.
    function bounds() {
      const { w, h } = area();
      return {
        xMin: -w / 2 + 16,
        xMax: w / 2 - SPRITE_W - 16,
        yMin: Math.min(0, -(h - SPRITE_H - 120)),
      };
    }
    // The comparison cards' boxes, in the same anchor-relative coordinates as
    // (x, y): x from the horizontal center, y from the bottom-6 floor line.
    function cardRects() {
      const el = areaRef.current;
      if (!el) return [];
      const a = el.getBoundingClientRect();
      const floorY = a.top + a.height - 24; // bottom-6 anchor line
      return Array.from(document.querySelectorAll("[data-compare-card]")).map((c) => {
        const r = c.getBoundingClientRect();
        return {
          left: r.left - a.left - a.width / 2,
          right: r.right - a.left - a.width / 2,
          top: r.top - floorY,
          bottom: r.bottom - floorY,
        };
      });
    }
    type CardRect = ReturnType<typeof cardRects>[number];
    // First card whose face the walk from (x0,y0) to (x1,y1) would pass behind,
    // sampled along the sprite-center's straight-line path.
    function cardOnPath(x0: number, y0: number, x1: number, y1: number): CardRect | null {
      const cards = cardRects();
      if (!cards.length) return null;
      const steps = 24;
      for (let i = 1; i <= steps; i++) {
        const cx = x0 + ((x1 - x0) * i) / steps + SPRITE_W / 2;
        const cy = y0 + ((y1 - y0) * i) / steps - SPRITE_H / 2;
        const hit = cards.find(
          (c) => cx > c.left && cx < c.right && cy > c.top && cy < c.bottom,
        );
        if (hit) return hit;
      }
      return null;
    }

    // Walk to (tx, ty): look where you're going first — face the target, turning
    // around (back view) only when the trek climbs the screen, with a longer beat
    // when the orientation actually changes — then glide there at `speed`.
    // Returns the full look+walk duration so callers can schedule past it.
    function walkTo(tx: number, ty: number, onArrive?: () => void, speed = WALK_SPEED): number {
      // A click can interrupt a glide in flight, and the refs hold that walk's
      // TARGET, not where she visually is — so a downward click mid-descent would
      // read as "upward" against the stale target and wrongly show her back.
      // Read her actual mid-glide position off the animating transform instead.
      const pos = posRef.current;
      if (pos) {
        const t = getComputedStyle(pos).transform;
        if (t && t !== "none") {
          const m = new DOMMatrixReadOnly(t);
          xRef.current = m.m41;
          yRef.current = m.m42;
        }
      }
      const dx = tx - xRef.current;
      const dy = ty - yRef.current;
      const ms = Math.max(500, (Math.hypot(dx, dy) / speed) * 1000);
      const dir: 1 | -1 = dx >= 0 ? 1 : -1;
      const back = dy < -BACK_DY; // negative y is up-screen; downward walks stay front-facing
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

    // Duck fully behind `card`, then rise so just her face and fingers clear its
    // top border (the card hides the rest), hold the peek ~0.75-2.25s, sink back
    // down, and hand control to `andThen`.
    function peekBehind(card: CardRect, andThen: () => void) {
      const { xMin, xMax } = bounds();
      const hideX = Math.min(
        xMax,
        Math.max(xMin, (card.left + card.right) / 2 - SPRITE_W / 2),
      );
      const hideY = Math.min(card.bottom - 8, card.top + SPRITE_H + 24);
      const hold = 750 + Math.random() * 1500;
      walkTo(hideX, hideY, () => {
        setPeeking(true);
        // Rise: the peek sprite's bottom to just below the card's top edge, so
        // the fingertip rows hook over it.
        setWalkMs(350);
        yRef.current = card.top + 2;
        setY(yRef.current);
        after(350 + hold, () => {
          setWalkMs(300);
          yRef.current = hideY;
          setY(hideY);
          after(320, () => {
            setPeeking(false);
            andThen();
          });
        });
      });
    }

    function act() {
      const { w } = area();
      const { xMin, xMax, yMin } = bounds();
      const roll = Math.random();
      if (roll < 0.5) {
        // Wander anywhere in the play area — but crossing a card's border turns
        // the walk into a duck-behind-and-peek detour before continuing.
        const tx = xMin + Math.random() * (xMax - xMin);
        const ty = yMin * Math.random();
        const onward = () => schedule(walkTo(tx, ty) + 400 + Math.random() * 1600);
        const card = cardOnPath(xRef.current, yRef.current, tx, ty);
        if (card) peekBehind(card, onward);
        else onward();
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
        facingRef.current = facingRef.current === 1 ? -1 : 1; // glance the other way
        setFacing(facingRef.current);
        schedule(700 + Math.random() * 1000);
      } else {
        schedule(1600 + Math.random() * 2600); // just stand there, being round
      }
    }

    // Player clicks, caught on the play screen itself (the roam layer takes no
    // pointer events, so cards and panel controls keep working untouched): a click
    // on her pops the "?", anywhere else sends her walking there.
    function onClick(e: MouseEvent) {
      if ((e.target as Element | null)?.closest("button, a, input, select")) return;
      const el = areaRef.current;
      if (!el) return;
      const box = spriteBoxRef.current?.getBoundingClientRect();
      if (
        box &&
        e.clientX >= box.left - 4 &&
        e.clientX <= box.right + 4 &&
        e.clientY >= box.top - 4 &&
        e.clientY <= box.bottom + 4
      ) {
        setQmark((k) => k + 1);
        setShowQmark(true);
        after(1300, () => setShowQmark(false));
        return;
      }
      const a = el.getBoundingClientRect();
      const { xMin, xMax, yMin } = bounds();
      // Aim her sprite's center at the click, clamped to the walkable box.
      const tx = e.clientX - a.left - a.width / 2 - SPRITE_W / 2;
      const ty = e.clientY - (a.top + a.height - 24) + SPRITE_H / 2;
      // A command interrupts whatever she was doing (pending acts, a held peek).
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      setPeeking(false);
      setShowQmark(false);
      const cx = Math.min(xMax, Math.max(xMin, tx));
      const cy = Math.min(0, Math.max(yMin, ty));
      // Commanded walks hustle at double the idle-wander toddle.
      schedule(walkTo(cx, cy, undefined, WALK_SPEED * 2) + 600 + Math.random() * 1400);
    }
    const screen = areaRef.current?.parentElement;
    screen?.addEventListener("click", onClick);

    schedule(1500);
    return () => {
      screen?.removeEventListener("click", onClick);
      timers.forEach((t) => clearTimeout(t));
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

  const rows = peeking
    ? PEEK_SPRITE
    : showBack
      ? BACK_SPRITE
      : blink
        ? BLINK_SPRITE
        : SPRITE;

  return (
    // Full-bleed roam layer under the board; the parent's overflow-hidden clips
    // the sprite during the off-screen wrap walk. The bottom-6 anchor is bottom-
    // aligned, so the shorter peek sprite keeps the same floor line.
    <div ref={areaRef} aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute bottom-6 left-1/2">
        {/* wander positioner: glides to the target at a constant toddle */}
        <div
          ref={posRef}
          style={{
            transform: `translate(${x}px, ${y}px)`,
            transition: `transform ${walkMs}ms ease-in-out`,
          }}
        >
          {/* "?" popup: outside the facing flip so it never renders mirrored */}
          {showQmark && (
            <div
              key={qmark}
              className="critter-hop absolute left-1/2 -translate-x-1/2"
              style={{ top: -20 }}
            >
              <PixelArt rows={QMARK} scale={0.7} />
            </div>
          )}
          {/* facing flip (instant), separate from the glide so the transforms don't fight.
              The sprite art natively faces LEFT, so facing=1 (moving right) mirrors it. */}
          <div ref={spriteBoxRef} style={{ transform: `scaleX(${-facing})` }}>
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
                  <PixelArt rows={rows} scale={DISPLAY_SCALE} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
