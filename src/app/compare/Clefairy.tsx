"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  GYARADOS_HEAD,
  GYARADOS_PALETTE,
  GYARADOS_SEGMENT,
  GYARADOS_TAIL,
} from "./gyaradosSprite";

// A relaxed toddle, in px/s. Walk duration scales with distance so speed stays constant.
const WALK_SPEED = 41;

type Emote = "none" | "hop" | "wiggle" | "dance";

// One bar of the click dance (must match the clefairy-dance keyframe duration);
// the routine runs three bars with a facing flip between them.
const DANCE_BEAT_MS = 800;

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
  ".......MdPPPPPPPPddddpPPPPPPPcdddMkkkMDDM",
  ".......MPPPPPDcPPPPPPcDPPPPPPcPPPdkkkDDDk",
  ".......MPPPPDPWPPPPPWPPDPPPPcMPPPdMkkDDk.",
  ".......MPPPPMckPPPPPkPPMPPPPMPdPPPdkMDk..",
  ".......MPPPPMPkPPPPPkPPMPPPPMdPPPPPMkMM..",
  ".......MPDDdPDgcppPPgcDPDDdMcPcPPddMkDDM.",
  ".......MPDDDccPkkkWkPcPPDDDPPPPPPMddkDDDM",
  ".......MPPPPPPPPkrrrPPPPPPPPPPPPPMddkMDDk",
  ".......MPPPPPPPcrrrrcPPPPPPPPPPPMdddk....",
  ".......MddddddddddddddddddddddddddddM....",
  "..........kk.kk.kk......kk.kk.kk.........",
  ".........kPPkPPkPPk....kPPkPPkPPk........",
  ".........kddkddkddk....kddkddkddk........",
];

// Nervous peek frames: the peek sprite with each eye widened to white and the
// pupil darted one column to the side (the pupil is the k pair below each eye's W
// highlight; the vacated column becomes eye-white, which reads as wide scared
// eyes). Every peek is a nervous one now — she only ever hides when Gyarados is
// on the prowl — so these alternate while she peeks, scanning the room for him.
const PUPIL_ROWS = [15, 16];
const PUPIL_COLS = [14, 20];
function dartEyes(rows: string[], dx: -1 | 1): string[] {
  return rows.map((row, y) => {
    if (!PUPIL_ROWS.includes(y)) return row;
    const chars = [...row];
    for (const col of PUPIL_COLS) {
      chars[col] = "W";
      chars[col + dx] = "k";
    }
    return chars.join("");
  });
}
const NERVOUS_PEEK = [dartEyes(PEEK_SPRITE, -1), dartEyes(PEEK_SPRITE, 1)];

// A tiny alarmed "!" (red fill, black outline) popped over her head mid-peek.
const EMARK = [
  ".kk.",
  "krrk",
  "krrk",
  "krrk",
  "krrk",
  ".kk.",
  "....",
  ".kk.",
  "krrk",
  ".kk.",
];

// Walk frames: while she glides, alternate lifting each foot so the motion reads
// as steps rather than a rock. A lift shifts the foot's column strip up LIFT rows:
// below the hip line it's a pure shift (the vacated rows go empty), and where the
// raised foot overlaps the body its opaque pixels win — the foot tucks in front of
// her rump — while its transparent pixels leave the body art intact.
const FEET_TOP = 35; // first row that is feet, not body, in SPRITE/BACK_SPRITE
const LIFT = 2;
const LEFT_FOOT: [number, number] = [10, 17]; // column span of each foot
const RIGHT_FOOT: [number, number] = [22, 31];

function liftFoot(rows: string[], [c0, c1]: [number, number]): string[] {
  return rows.map((row, y) => {
    if (y < FEET_TOP - LIFT) return row;
    const chars = [...row];
    for (let x = c0; x <= c1; x++) {
      const src = rows[y + LIFT]?.[x] ?? ".";
      if (y >= FEET_TOP || src !== ".") chars[x] = src;
    }
    return chars.join("");
  });
}

// One frame per foot; the step timer alternates between them while walking.
const WALK_FRONT = [liftFoot(SPRITE, LEFT_FOOT), liftFoot(SPRITE, RIGHT_FOOT)];
const WALK_BACK = [liftFoot(BACK_SPRITE, LEFT_FOOT), liftFoot(BACK_SPRITE, RIGHT_FOOT)];

// Drawing size of one sprite pixel; the svg is displayed at DISPLAY_SCALE of that
// (rects stay on integer coordinates, the browser scales the whole vector down).
const PX = 2;
const DISPLAY_SCALE = 0.75;

// Rendered sprite footprint, for keeping walk targets inside the roam area.
const SPRITE_W = SPRITE[0].length * PX * DISPLAY_SCALE;
const SPRITE_H = SPRITE.length * PX * DISPLAY_SCALE;

// The top-down Gyarados strip, tail→head along +x, rotated at runtime to his
// travel heading. Each piece oscillates across the travel axis (amplitude
// growing toward the tail); the traveling wave comes from the per-piece
// animation delays — the head (rendered last) leads, the tail follows.
const GYARADOS_PIECES = [
  { rows: GYARADOS_TAIL, amp: 13 },
  { rows: GYARADOS_SEGMENT, amp: 11 },
  { rows: GYARADOS_SEGMENT, amp: 8 },
  { rows: GYARADOS_SEGMENT, amp: 5 },
  { rows: GYARADOS_HEAD, amp: 3 },
];
const WAVE_LAG_MS = 340; // per-piece phase lag within the 2.8s undulation
const OVERLAP_PX = 3 * PX * DISPLAY_SCALE; // adjoining pieces merge into one tube
const GYARADOS_MAX_AMP = 13;
// Footprint for card avoidance: strip length minus overlaps; strip thickness
// plus the full wave swing either side of the spine.
const GYARADOS_W =
  GYARADOS_PIECES.reduce((w, piece) => w + piece.rows[0].length * PX * DISPLAY_SCALE, 0) -
  (GYARADOS_PIECES.length - 1) * OVERLAP_PX;
const GYARADOS_H = 16 * PX * DISPLAY_SCALE + 2 * GYARADOS_MAX_AMP;
// A slow menacing prowl (she toddles at 41), a faster dive/exit lunge, how long
// a visit terrorizes the play area, and the randomized gap until the next one.
const GYARADOS_SPEED = 70;
const GYARADOS_LUNGE_SPEED = 170;
const VISIT_MS = 8000;
const VISIT_GAP_MIN_MS = 25_000;
const VISIT_GAP_SPAN_MS = 35_000;

// A walk whose vertical component exceeds this reads as "moving up the screen":
// Clefairy turns around (into the page, back to the viewer) for upward treks only —
// walking down she stays facing the viewer.
const BACK_DY = 24;

function PixelArt({
  rows,
  scale,
  palette = PALETTE,
}: {
  rows: string[];
  scale: number;
  palette?: Record<string, string>;
}) {
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
              fill={palette[ch]}
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
// natural, not metronomic. Once in a while Gyarados tears in and hunts her for 8
// seconds: she bolts behind a card (the only time she hides) and steals nervous
// peeks — darting eyes, "!" overhead — while he prowls the open water seen from
// above, body snaking in a slow wave, never crossing behind the board.
// She also hops on every pick (the `picks`-keyed wrapper, kept separate from the
// wander emote so the two one-shot animations can't cancel each other). The roam
// layer itself takes no pointer events; instead a click listener on the play screen
// sends her walking to the clicked spot; a click landing ON her sets off a little
// three-bar dance. She stays aria-hidden: decorative either way. The layer
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
  // Which walk frame (0 = left foot up, 1 = right foot up) is showing mid-glide.
  const [stepFrame, setStepFrame] = useState(0);
  // Which darting-eye frame (0 = pupils left, 1 = right) is showing mid-peek.
  const [dartFrame, setDartFrame] = useState(0);
  // Gyarados while he's visiting (null = off screen): target position in the same
  // anchor-relative coordinates as her x/y, glide duration, and travel heading in
  // degrees (cumulative, so turns always tween the short way around).
  const [gyarados, setGyarados] = useState<{
    x: number;
    y: number;
    ms: number;
    angle: number;
  } | null>(null);
  // Current position/orientation, readable inside the timer loop without re-running
  // the effect (the loop's closure would only ever see the initial state).
  const xRef = useRef(0);
  const yRef = useRef(0);
  const facingRef = useRef<1 | -1>(1);
  const backRef = useRef(false);
  // Gyarados' current glide target and cumulative heading, readable inside the
  // timer loop like her refs.
  const gyaradosRef = useRef({ x: 0, y: 0 });
  const gyaradosAngleRef = useRef(0);
  // True while a Gyarados visit owns the stage. Player clicks are ignored for the
  // duration so they can't clear the episode's timers mid-choreography.
  const episodeRef = useRef(false);
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

    // The hiding spot behind `card`: centered on it, ducked fully below its top
    // edge so the z-10 card hides all of her.
    function hideSpotBehind(card: CardRect) {
      const { xMin, xMax } = bounds();
      return {
        x: Math.min(xMax, Math.max(xMin, (card.left + card.right) / 2 - SPRITE_W / 2)),
        y: Math.min(card.bottom - 8, card.top + SPRITE_H + 24),
      };
    }

    // One nervous peek from behind `card`: rise until just her face and fingers
    // clear its top edge (the fingertip rows hook over it), scan the room with
    // darting eyes and the "!" pop for ~1.1s, then sink back down to `hideY`.
    function nervousPeek(card: CardRect, hideY: number) {
      setPeeking(true);
      setWalkMs(350);
      yRef.current = card.top + 2;
      setY(yRef.current);
      after(350 + 1100, () => {
        setWalkMs(300);
        yRef.current = hideY;
        setY(hideY);
        after(320, () => setPeeking(false));
      });
    }

    // True if a w-by-h sprite box anchored at (x, y) — its bottom-left corner,
    // matching the positioners — sits clear of every card rect, with a margin.
    function clearOfCards(x: number, y: number, w: number, h: number, cards: CardRect[]) {
      return !cards.some(
        (c) => x < c.right + 8 && x + w > c.left - 8 && y - h < c.bottom + 8 && y > c.top - 8,
      );
    }

    // Gyarados' box for clearance checks: GYARADOS_H already includes the wave
    // swing on both sides of the spine, so shift the anchor down by one swing.
    function gyaradosClear(x: number, y: number, cards: CardRect[]) {
      return clearOfCards(x, y + GYARADOS_MAX_AMP, GYARADOS_W, GYARADOS_H, cards);
    }

    // Glide Gyarados to (tx, ty), heading into his direction of travel. The
    // heading accumulates by the SHORTEST turn from the previous one, so the CSS
    // rotation tween never spins him the long way round. Returns the glide
    // duration so the visit choreography can schedule past it.
    function gyaradosGlide(tx: number, ty: number, speed = GYARADOS_SPEED): number {
      const from = gyaradosRef.current;
      const ms = Math.max(400, (Math.hypot(tx - from.x, ty - from.y) / speed) * 1000);
      const raw = (Math.atan2(ty - from.y, tx - from.x) * 180) / Math.PI;
      const prev = gyaradosAngleRef.current;
      const delta = ((raw - (((prev % 360) + 360) % 360) + 540) % 360) - 180;
      gyaradosAngleRef.current = prev + delta;
      gyaradosRef.current = { x: tx, y: ty };
      setGyarados({ x: tx, y: ty, ms, angle: gyaradosAngleRef.current });
      return ms;
    }

    // A random patch of open "white space": inside the play area but clear of
    // every card box, with the glide path sampled at quarter points so a hop
    // from one side to the other doesn't cut behind the board. Rejection-
    // sampled; if he's hemmed in, he just holds position for a beat.
    function openWater(): { x: number; y: number } {
      const { w, h } = area();
      const xMin = -w / 2 + 8;
      const xMax = w / 2 - GYARADOS_W - 8;
      const yMin = Math.min(0, -(h - GYARADOS_H - 96));
      const cards = cardRects();
      const from = gyaradosRef.current;
      for (let tries = 0; tries < 30; tries++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin * Math.random();
        const pathClear = [0.25, 0.5, 0.75].every((f) =>
          gyaradosClear(from.x + (x - from.x) * f, from.y + (y - from.y) * f, cards),
        );
        if (gyaradosClear(x, y, cards) && pathClear) return { x, y };
      }
      return from;
    }

    // Her wander targets stay in the open too — she only ever tucks in behind a
    // card when Gyarados shows up, so an idle stroll must never park her (or
    // route her) behind the board. Same rejection sampling as openWater.
    function openMeadow(): { x: number; y: number } {
      const { xMin, xMax, yMin } = bounds();
      const cards = cardRects();
      for (let tries = 0; tries < 30; tries++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin * Math.random();
        const pathClear = [0.25, 0.5, 0.75].every((f) =>
          clearOfCards(
            xRef.current + (x - xRef.current) * f,
            yRef.current + (y - yRef.current) * f,
            SPRITE_W,
            SPRITE_H,
            cards,
          ),
        );
        if (clearOfCards(x, y, SPRITE_W, SPRITE_H, cards) && pathClear) return { x, y };
      }
      return { x: xRef.current, y: yRef.current };
    }

    // Turn to face the other way (a glance, or a dance twirl beat).
    function flip() {
      facingRef.current = facingRef.current === 1 ? -1 : 1;
      setFacing(facingRef.current);
    }

    // Visits ride their own timer handle, NOT the interruptible pool: a player
    // click clears the pool, and that must never cancel the next visit.
    let visitTimer: ReturnType<typeof setTimeout> | undefined;
    function scheduleVisit() {
      visitTimer = setTimeout(
        gyaradosVisit,
        VISIT_GAP_MIN_MS + Math.random() * VISIT_GAP_SPAN_MS,
      );
    }

    // One Gyarados visit: he lunges in from the side edge behind her, hunting the
    // spot where she stood, while she bolts behind the nearest card. He then
    // prowls the open water in beats for the rest of the 8s; she steals two
    // nervous peeks, and on what would be the third she steps back out to roam
    // instead — he's gone by then.
    function gyaradosVisit() {
      const cards = cardRects();
      if (!cards.length || document.hidden) {
        scheduleVisit(); // empty board or hidden tab: nowhere to hide — try later
        return;
      }
      episodeRef.current = true;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      setEmote("none"); // cut short a dance/hop; fleeing overrides celebration
      setPeeking(false);

      // She bolts behind the card nearest to where she's standing.
      const herX = xRef.current;
      const herY = yRef.current;
      const off = (c: CardRect) => Math.abs((c.left + c.right) / 2 - herX);
      const card = cards.reduce((a, b) => (off(a) <= off(b) ? a : b));
      const hide = hideSpotBehind(card);
      walkTo(hide.x, hide.y, undefined, WALK_SPEED * 3);

      // He glides in from the side edge behind her back, hunting her old spot.
      const { w, h } = area();
      const fromLeft = herX >= 0;
      const xMinG = -w / 2 + 8;
      const xMaxG = w / 2 - GYARADOS_W - 8;
      const yMinG = Math.min(0, -(h - GYARADOS_H - 96));
      const startX = fromLeft ? -w / 2 - GYARADOS_W - 24 : w / 2 + 24;
      const startY = Math.max(yMinG, Math.min(0, herY - SPRITE_H));
      gyaradosRef.current = { x: startX, y: startY };
      gyaradosAngleRef.current = fromLeft ? 0 : 180; // head into the screen
      setGyarados({ x: startX, y: startY, ms: 0, angle: gyaradosAngleRef.current });

      // Prowl beat: glide to fresh open water, pause, repeat while time remains;
      // then leave off a side edge — preferring one he can reach without cutting
      // behind the board — and despawn.
      function prowl(remaining: number) {
        if (remaining <= 0) {
          const g = gyaradosRef.current;
          const exits = [-w / 2 - GYARADOS_W - 24, w / 2 + 24].sort(
            (a, b) => Math.abs(a - g.x) - Math.abs(b - g.x),
          );
          const cards = cardRects();
          const pathClear = (exitX: number) =>
            [0.25, 0.5, 0.75].every((f) =>
              gyaradosClear(g.x + (exitX - g.x) * f, g.y, cards),
            );
          const exitX = exits.find(pathClear) ?? exits[0];
          const ms = gyaradosGlide(exitX, g.y, GYARADOS_LUNGE_SPEED);
          after(ms + 80, () => setGyarados(null));
          return;
        }
        const spot = openWater();
        const ms = gyaradosGlide(spot.x, spot.y);
        const pause = 150 + Math.random() * 350;
        after(ms + pause, () => prowl(remaining - ms - pause));
      }
      after(60, () => {
        // (60ms: let the off-screen spawn mount before animating, like the wrap.)
        // Dive at her old spot — unless that sits against the board, in which
        // case lunge to the nearest open water instead: he never crosses cards.
        const diveX = Math.max(xMinG, Math.min(xMaxG, herX + SPRITE_W / 2 - GYARADOS_W / 2));
        const diveY = Math.min(0, herY);
        const dive = gyaradosClear(diveX, diveY, cards) ? { x: diveX, y: diveY } : openWater();
        const diveMs = gyaradosGlide(dive.x, dive.y, GYARADOS_LUNGE_SPEED);
        after(diveMs, () => prowl(VISIT_MS - 60 - diveMs));
      });

      // Her side of the episode, on fixed beats under the 8s visit.
      after(2400, () => nervousPeek(card, hide.y));
      after(5100, () => nervousPeek(card, hide.y));
      after(VISIT_MS + 1200, () => {
        // All clear: step out to open space and get back to roaming. Target-only
        // clearance — the walk necessarily STARTS behind the card, so openMeadow's
        // path check would reject everything; falling to the floor below the
        // board is the guaranteed way out.
        episodeRef.current = false;
        const { xMin, xMax, yMin } = bounds();
        const cardsNow = cardRects();
        let spot = { x: xRef.current, y: 0 };
        for (let tries = 0; tries < 30; tries++) {
          const x = xMin + Math.random() * (xMax - xMin);
          const y = yMin * Math.random();
          if (clearOfCards(x, y, SPRITE_W, SPRITE_H, cardsNow)) {
            spot = { x, y };
            break;
          }
        }
        schedule(walkTo(spot.x, spot.y) + 600 + Math.random() * 1200);
        scheduleVisit();
      });
    }

    function act() {
      const { w } = area();
      const { xMax } = bounds();
      const roll = Math.random();
      if (roll < 0.5) {
        // Wander the open white space only (openMeadow keeps the target AND the
        // route clear of the board — she hides behind cards just for Gyarados).
        const spot = openMeadow();
        schedule(walkTo(spot.x, spot.y) + 400 + Math.random() * 1600);
      } else if (roll < 0.58) {
        // Stroll off the left edge and reappear from the right: walk fully out,
        // snap (walkMs 0 = no transition) to just past the right edge while
        // hidden, then keep walking left back into view. The wrap is a straight
        // trek across the whole width, so only take it when that shoreline is
        // clear of the board at her height; otherwise wander instead.
        const shoreClear = [0, 0.2, 0.4, 0.6, 0.8, 1].every((f) =>
          clearOfCards(
            -w / 2 + f * (w - SPRITE_W),
            yRef.current,
            SPRITE_W,
            SPRITE_H,
            cardRects(),
          ),
        );
        if (!shoreClear) {
          const spot = openMeadow();
          schedule(walkTo(spot.x, spot.y) + 400 + Math.random() * 1600);
          return;
        }
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
        flip(); // glance the other way
        schedule(700 + Math.random() * 1000);
      } else {
        schedule(1600 + Math.random() * 2600); // just stand there, being round
      }
    }

    // Player clicks, caught on the play screen itself (the roam layer takes no
    // pointer events, so cards and panel controls keep working untouched): a click
    // on her starts her dance, anywhere else sends her walking there.
    function onClick(e: MouseEvent) {
      // While Gyarados owns the stage she's busy hiding — ignore the audience
      // (a pool clear here would tear the visit's choreography apart).
      if (episodeRef.current) return;
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
        // She's delighted: three dance bars on the emote layer, twirling to face
        // the other way between bars. The pool clear interrupts pending acts (and
        // a dance already in progress restarts clean via the emote-layer remount).
        timers.forEach((t) => clearTimeout(t));
        timers.clear();
        setPeeking(false);
        setEmote("dance");
        setEmoteKey((k) => k + 1);
        after(DANCE_BEAT_MS, flip);
        after(DANCE_BEAT_MS * 2, flip);
        schedule(DANCE_BEAT_MS * 3 + 600 + Math.random() * 1200);
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
      const cx = Math.min(xMax, Math.max(xMin, tx));
      let cy = Math.min(0, Math.max(yMin, ty));
      // A click on the board would tuck her behind a card — she only hides there
      // during Gyarados visits, so stop her just below the card instead.
      const blocker = cardRects().find(
        (c) => !clearOfCards(cx, cy, SPRITE_W, SPRITE_H, [c]),
      );
      if (blocker) cy = Math.min(0, blocker.bottom + SPRITE_H + 6);
      // Commanded walks hustle at double the idle-wander toddle.
      schedule(walkTo(cx, cy, undefined, WALK_SPEED * 2) + 600 + Math.random() * 1400);
    }
    const screen = areaRef.current?.parentElement;
    screen?.addEventListener("click", onClick);

    schedule(1500);
    scheduleVisit();
    return () => {
      screen?.removeEventListener("click", onClick);
      timers.forEach((t) => clearTimeout(t));
      clearTimeout(visitTimer);
    };
  }, []);

  // Step cadence: alternate feet while a glide is in flight. 160ms/step suits the
  // toddle speed (~2 steps per 13px of travel at WALK_SPEED); the interval dies with
  // the walk so she always plants both feet when she stops.
  useEffect(() => {
    if (!walking) return;
    const timer = setInterval(() => setStepFrame((frame) => frame ^ 1), 160);
    return () => clearInterval(timer);
  }, [walking]);

  // Nervous eye darting: flick the pupils left/right while she peeks for Gyarados.
  useEffect(() => {
    if (!peeking) return;
    const timer = setInterval(() => setDartFrame((frame) => frame ^ 1), 240);
    return () => clearInterval(timer);
  }, [peeking]);

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

  // Mid-glide the stepping frames take over (they trump the blink: eyes stay open
  // while she watches where she's going); at rest the usual stand/blink pair shows.
  // Peeks only happen while Gyarados prowls, so they always wear the nervous eyes.
  const rows = peeking
    ? NERVOUS_PEEK[dartFrame]
    : walking
      ? (showBack ? WALK_BACK : WALK_FRONT)[stepFrame]
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
          {/* alarmed "!": mounts fresh with each peek (so the pop-in replays);
              outside the facing flip so it never renders mirrored */}
          {peeking && (
            <div
              className="critter-hop absolute left-1/2 -translate-x-1/2"
              style={{ top: -16 }}
            >
              <PixelArt rows={EMARK} scale={0.7} />
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
                  emote === "hop"
                    ? "critter-hop"
                    : emote === "wiggle"
                      ? "wiggle"
                      : emote === "dance"
                        ? "clefairy-dance"
                        : ""
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

      {/* Gyarados, while visiting: same bottom-center anchor and glide scheme as
          her positioner. The strip of pieces (tail first, head last) lies along
          +x; the rotator turns it to the travel heading on its own transition,
          and every piece runs the shared undulate keyframe with a staggered
          delay, so a slow wave travels head-to-tail while he glides. */}
      {gyarados && (
        <div className="absolute bottom-6 left-1/2">
          <div
            style={{
              transform: `translate(${gyarados.x}px, ${gyarados.y}px)`,
              transition: `transform ${gyarados.ms}ms ease-in-out`,
            }}
          >
            <div
              className="flex items-center"
              style={{
                transform: `rotate(${gyarados.angle}deg)`,
                transition: "transform 600ms ease-in-out",
              }}
            >
              {GYARADOS_PIECES.map((piece, i) => (
                <div
                  key={i}
                  className="gyarados-piece"
                  style={
                    {
                      "--amp": `${piece.amp}px`,
                      // Negative delay = phase advance; the head (largest i)
                      // leads and the wave ripples back toward the tail.
                      animationDelay: `${-i * WAVE_LAG_MS}ms`,
                      marginLeft: i === 0 ? 0 : -OVERLAP_PX,
                    } as CSSProperties
                  }
                >
                  <PixelArt
                    rows={piece.rows}
                    scale={DISPLAY_SCALE}
                    palette={GYARADOS_PALETTE}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
