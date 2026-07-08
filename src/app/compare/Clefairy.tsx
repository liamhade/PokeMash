"use client";

import { useEffect, useRef, useState } from "react";
import { SERPENTS } from "./serpentSprites";

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
// eyes). Every peek is a nervous one now — she only ever hides when a serpent is
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

// The RATING dial band under each card slot. The dial is out of flow (absolute
// top-full + mt-3 in RatingDial), so the card wrapper's rect does NOT include it —
// the roam exclusion must be extended down by hand or she strolls over the numbers.
// mt-3 (12px) + the text-3xl line (~36px) with a little slack.
const DIAL_BAND_H = 52;

// Each serpent is one big traced sprite — a screen-dominating legendary. To make
// it swim, the sprite is sliced into vertical columns SNAKE_SLICE_W design-px
// wide, rendered as <g> bands of ONE svg, and each band oscillates vertically via
// an SMIL <animateTransform> (translate, in svg user units so it scales with the
// art and the bands never seam apart — and WebKit honors it, unlike a CSS
// transform on a <g>). A per-band phase delay sends a traveling sine down the
// body, and the amplitude ramps from ~0 at the head to the full waveAmp at the
// tail. SNAKE_WAVES is how many sine wavelengths span the body at once;
// SNAKE_PERIOD_MS is one oscillation (the animateTransform dur). On-screen size
// is per serpent (serpent.renderScale), since the unrolled Rayquaza is far longer.
const SNAKE_SLICE_W = 3; // design px per column slice
const SNAKE_WAVES = 1.25;
const SNAKE_PERIOD_MS = 1800;
const SNAKE_HEAD_AMP = 0.12; // fraction of waveAmp the head still keeps
// Precompute each serpent's column bands: the starting column, its cells, and
// the per-band amplitude (in svg user units = design px * PX) and phase delay.
const SERPENT_SLICES = SERPENTS.map((serpent) => {
  const rows = serpent.image;
  const w = rows[0].length;
  const maxAmpUnits = serpent.waveAmp * PX;
  const bands = [];
  for (let x0 = 0; x0 < w; x0 += SNAKE_SLICE_W) {
    const xEnd = Math.min(x0 + SNAKE_SLICE_W, w);
    const cells: { x: number; y: number; ch: string }[] = [];
    for (let y = 0; y < rows.length; y++) {
      for (let x = x0; x < xEnd; x++) {
        const ch = rows[y][x];
        if (ch !== ".") cells.push({ x, y, ch });
      }
    }
    const xc = Math.min(1, (x0 + SNAKE_SLICE_W / 2) / w); // 0 tail (left) .. 1 head
    bands.push({
      cells,
      ampUnits: maxAmpUnits * (SNAKE_HEAD_AMP + (1 - SNAKE_HEAD_AMP) * (1 - xc)),
      // Head (large xc) leads; the crest then travels head -> tail.
      delayMs: -SNAKE_PERIOD_MS * SNAKE_WAVES * xc,
    });
  }
  return bands;
});
// Per-serpent on-screen size: rendered width (used to spawn/exit fully off the
// edges) and strip height (used to seat the crossing lane under the dials).
const SERPENT_DIMS = SERPENTS.map((serpent) => ({
  w: serpent.image[0].length * PX * serpent.renderScale,
  stripH: serpent.image.length * PX * serpent.renderScale,
}));
// A slow menacing swim (she toddles at 41), how long a visit terrorizes the
// play area, and the randomized gap until the next one. The crossing height
// isn't a constant: it's measured off the board each visit (the lane under
// the rating dials).
const SERPENT_SPEED = 70;
// The crossing speed is derived from VISIT_MS (crossMs = VISIT_MS - 600, distance
// fixed by the screen), so a longer visit == a slower swim. Scaled up over time
// (12_500 -> 16_667 -> 22_223, x4/3 each) to slow both serpents ~25% per pass; the
// dependent flee/despawn/episode timers follow.
const VISIT_MS = 22_223;
const VISIT_GAP_MIN_MS = 15_000;
const VISIT_GAP_SPAN_MS = 45_000;

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

// A traced serpent, drawn as one svg whose vertical column-bands each oscillate
// (a traveling sine down the body, amplitude growing tailward) so it snakes like
// a swimming fish. overflow:visible lets the bands ride outside the box as they
// wave; the bands are precomputed in SERPENT_SLICES.
function SnakeSprite({ kind }: { kind: number }) {
  const spec = SERPENTS[kind];
  const w = spec.image[0].length * PX;
  const h = spec.image.length * PX;
  return (
    <svg
      width={w * spec.renderScale}
      height={h * spec.renderScale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      style={{ overflow: "visible" }}
    >
      {SERPENT_SLICES[kind].map((band, bi) => (
        <g key={bi}>
          {/* SMIL, not a CSS keyframe: WebKit/Safari won't animate a CSS
              `transform` on an SVG <g>, but it does honor <animateTransform>.
              Each band oscillates in y; the negative `begin` phase-shifts it so
              a traveling wave runs down the body. */}
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="translate"
            values={`0 ${-band.ampUnits};0 ${band.ampUnits};0 ${-band.ampUnits}`}
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
            dur={`${SNAKE_PERIOD_MS}ms`}
            begin={`${band.delayMs}ms`}
            repeatCount="indefinite"
          />
          {band.cells.map((c) => (
            <rect
              key={`${c.x}-${c.y}`}
              x={c.x * PX}
              y={c.y * PX}
              width={PX}
              height={PX}
              fill={spec.palette[c.ch]}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

// A pixel-art Clefairy that keeps the player company, roaming the whole play area
// (everything under the nav). A single self-rescheduling timer is its "brain": it
// walks to random spots — turning its back to the viewer for upward treks — strolls
// off the left edge to reappear from the right, stands around, glances, blinks, and
// mixes in little hop/wiggle emotes with randomized pauses so the rhythm feels
// natural, not metronomic. Once in a while a legendary serpent (Gyarados and
// Rayquaza alternate) sweeps across the screen and hunts her: she bolts behind a
// card (the only time she hides) and steals nervous peeks — darting eyes, "!"
// overhead — while it swims by, its long body snaking in a traveling wave
// (both cruise one straight pass along the lane under the rankings).
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
  // True while her positioner is actually moving on screen, sampled off the
  // animating transform. The walk visuals (stepping feet, waddle) key off
  // THIS rather than a "walking" flag: a timer race could strand a flag true
  // after the glide ended (stepping in place) or false while one was still in
  // flight (frozen feet mid-run) — real motion can't lie.
  const [moving, setMoving] = useState(false);
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
  // The visiting serpent (null = off screen): which one (index into SERPENTS),
  // target position in the same anchor-relative coordinates as her x/y, glide
  // duration, and horizontal travel direction (side profiles flip, they
  // don't rotate).
  const [serpent, setSerpent] = useState<{
    kind: number;
    x: number;
    y: number;
    ms: number;
    dir: 1 | -1;
  } | null>(null);
  // Current position/orientation, readable inside the timer loop without re-running
  // the effect (the loop's closure would only ever see the initial state).
  const xRef = useRef(0);
  const yRef = useRef(0);
  const facingRef = useRef<1 | -1>(1);
  const backRef = useRef(false);
  // The serpent's current glide target, readable inside the timer loop like her
  // refs; visitKindRef alternates Gyarados/Rayquaza. (Entry side isn't a ref:
  // each visit enters on the SAME side of the screen Clefairy is standing
  // at that moment, so it's derived per visit.)
  const serpentRef = useRef({ x: 0, y: 0 });
  const visitKindRef = useRef(0);
  // True while a serpent visit owns the stage. Player clicks are ignored for the
  // duration so they can't clear the episode's timers mid-choreography.
  const episodeRef = useRef(false);
  // True once the serpent has slithered off screen (despawned) during a visit.
  // Her next peek reads this to decide whether to duck back into hiding or, seeing
  // the coast is clear, step out and resume roaming. Reset at the start of each visit.
  const serpentGoneRef = useRef(false);
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
      return Array.from(document.querySelectorAll<HTMLElement>("[data-compare-card]"))
        .map((c) => {
          // The card button slides in via a translate transform (from 120vh
          // below) and scales up on hover — and getBoundingClientRect includes
          // transforms, so a rect read mid-slide or mid-hover is a valid-
          // looking box that is NOT where the card rests (hides went under
          // the floor; peeks anchored to an offset box). Measure the layout
          // box instead: offset geometry against the transform-free wrapper.
          const wrap = (c.offsetParent as HTMLElement | null) ?? c;
          const w = wrap.getBoundingClientRect();
          const left = w.left + c.offsetLeft;
          const top = w.top + c.offsetTop;
          return {
            left: left - a.left - a.width / 2,
            right: left + c.offsetWidth - a.left - a.width / 2,
            top: top - floorY,
            bottom: top + c.offsetHeight - floorY,
            // The roam exclusion runs past the wrapper's bottom to cover the
            // rating dial hanging below it (see DIAL_BAND_H — the dial is
            // absolutely positioned, so the wrapper rect stops at the card).
            // Hide/peek geometry keeps the bare card box.
            roamBottom: w.bottom - floorY + DIAL_BAND_H,
            // The card that just won the last pick (see ComparisonArea): the
            // one she trusts to hide behind when a serpent shows up.
            winner: c.hasAttribute("data-compare-winner"),
          };
        })
        // Belt and braces for a card measured mid-mount (styles not yet
        // applied): only rects that look like real on-board cards count.
        .filter((c) => c.right - c.left > 40 && c.bottom - c.top > 40 && c.bottom < 60);
    }
    type CardRect = ReturnType<typeof cardRects>[number];
    // The no-go boxes for ROAMING (idle wanders, step-outs, commanded walks):
    // each card slot extended down over its rating dial. She only ever enters
    // these — ducking behind a card proper — when a serpent is on screen.
    function roamRects() {
      return cardRects().map((c) => ({ ...c, bottom: c.roamBottom }));
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
        after(ms, () => {
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
      const { xMin, xMax, yMin } = bounds();
      // Clamped into the walkable box: even if a rect slips past the cardRects
      // filter, she must never be sent below the floor or above the play area.
      return {
        x: Math.min(xMax, Math.max(xMin, (card.left + card.right) / 2 - SPRITE_W / 2)),
        y: Math.min(0, Math.max(yMin, Math.min(card.bottom - 8, card.top + SPRITE_H + 24))),
      };
    }

    // One nervous peek from behind `card`, then either hide again or leave. She
    // rises until just her face and fingers clear its top edge (the fingertip
    // rows hook over it), scans the room with darting eyes and the "!" pop for
    // ~1.1s, then: if the serpent has already left she steps out and roams (she
    // looked and saw nothing to fear); otherwise she sinks back to `hideY` and
    // schedules another cautious peek. Self-chaining, so one call at arrival keeps
    // her peeking for the whole visit. No-op once the visit is over.
    function nervousPeek(card: CardRect, hideY: number) {
      if (!episodeRef.current) return;
      // Every pick swaps the board, so the visit-start rect can be stale (a
      // new occupant with a different height). Re-measure her slot — the card
      // nearest her hiding spot — at peek time; heights differ card to card.
      const fresh = cardRects();
      const herX = xRef.current + SPRITE_W / 2;
      const near = fresh.length
        ? fresh.reduce((a2, b2) =>
            Math.abs((a2.left + a2.right) / 2 - herX) <= Math.abs((b2.left + b2.right) / 2 - herX)
              ? a2
              : b2,
          )
        : card;
      setPeeking(true);
      setWalkMs(350);
      yRef.current = Math.min(0, near.top + 2); // never below the floor
      setY(yRef.current);
      after(350 + 1100, () => {
        if (!episodeRef.current) return;
        // Coast clear: don't duck back under the card — walk off and roam.
        if (serpentGoneRef.current) {
          emerge();
          return;
        }
        // Still lurking: sink back into hiding, then peek again after a beat.
        // The ~3150ms gap keeps rise-to-rise near the original 4600ms cadence.
        setWalkMs(300);
        yRef.current = hideY;
        setY(hideY);
        after(320, () => setPeeking(false));
        after(3150, () => nervousPeek(card, hideY));
      });
    }

    // True if a w-by-h sprite box anchored at (x, y) — its bottom-left corner,
    // matching the positioners — sits clear of every card rect, with a margin.
    function clearOfCards(x: number, y: number, w: number, h: number, cards: CardRect[]) {
      return !cards.some(
        (c) => x < c.right + 8 && x + w > c.left - 8 && y - h < c.bottom + 8 && y > c.top - 8,
      );
    }

    // Sample a straight glide every ~40px against `clear`. (A fixed handful of
    // fractions let long hops clip card corners between samples — the sworn
    // enemy of "never behind the board".)
    function pathClear(
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      clear: (x: number, y: number) => boolean,
    ) {
      const steps = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 40));
      for (let i = 1; i < steps; i++) {
        if (!clear(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps)) return false;
      }
      return true;
    }

    // Glide the serpent to (tx, ty), facing its direction of travel (a near-
    // vertical drift keeps the current facing). Returns the glide duration so
    // the visit choreography can schedule past it.
    function serpentGlide(tx: number, ty: number, speed = SERPENT_SPEED): number {
      const from = serpentRef.current;
      const ms = Math.max(400, (Math.hypot(tx - from.x, ty - from.y) / speed) * 1000);
      const dx = tx - from.x;
      serpentRef.current = { x: tx, y: ty };
      setSerpent(
        (s) =>
          s && { ...s, x: tx, y: ty, ms, dir: Math.abs(dx) > 6 ? (dx > 0 ? 1 : -1) : s.dir },
      );
      return ms;
    }

    // Her wander targets stay in the open — she only ever tucks in behind a card
    // when a serpent shows up, so an idle stroll must never park her (or route
    // her) behind the board. Rejection-sample a spot whose box AND straight path
    // from her current position both clear every card rect.
    function openMeadow(): { x: number; y: number } {
      const { xMin, xMax, yMin } = bounds();
      const cards = roamRects();
      const clear = (x: number, y: number) => clearOfCards(x, y, SPRITE_W, SPRITE_H, cards);
      for (let tries = 0; tries < 30; tries++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin * Math.random();
        if (clear(x, y) && pathClear(xRef.current, yRef.current, x, y, clear)) return { x, y };
      }
      return { x: xRef.current, y: yRef.current };
    }

    // A clear spot to step out to, checking only the TARGET: for when she is
    // already overlapping the board (cards mounted over her, or she's emerging
    // from a hide), where any path check from the start point must fail.
    // Takes the NEAREST clear candidate so she steps out right beside where
    // she is and resumes roaming immediately, instead of trekking across the
    // screen to a random far spot.
    function stepOutSpot(): { x: number; y: number } {
      const { xMin, xMax, yMin } = bounds();
      const cards = roamRects();
      let best: { x: number; y: number } | null = null;
      let bestD = Infinity;
      for (let tries = 0; tries < 30; tries++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin * Math.random();
        if (!clearOfCards(x, y, SPRITE_W, SPRITE_H, cards)) continue;
        const d = Math.hypot(x - xRef.current, y - yRef.current);
        if (d < bestD) {
          best = { x, y };
          bestD = d;
        }
      }
      return best ?? { x: xRef.current, y: 0 }; // the floor lane below the board is always open
    }

    // End the current serpent visit: drop the hiding pose and stroll to an open
    // spot, handing the stage back to the wander brain. Idempotent — the peek
    // loop and the safety-net timer both call it, and whichever runs first wins
    // (the episodeRef guard makes the loser a no-op).
    function emerge() {
      if (!episodeRef.current) return;
      episodeRef.current = false;
      setPeeking(false);
      const spot = stepOutSpot();
      schedule(walkTo(spot.x, spot.y) + 600 + Math.random() * 1200);
    }

    // Turn to face the other way (a glance, or a dance twirl beat).
    function flip() {
      facingRef.current = facingRef.current === 1 ? -1 : 1;
      setFacing(facingRef.current);
    }

    // Serpent motion timers also ride outside the interruptible pool: the
    // flight's tail outlives episodeRef (the episode-end timer fires on the
    // path-length estimate, the real flight accumulates timer overhead), and a
    // player click in that window must not freeze the serpent mid-exit — or
    // kill the despawn step that schedules the next visit.
    const flightTimers = new Set<ReturnType<typeof setTimeout>>();
    function flightAfter(delay: number, fn: () => void) {
      const t = setTimeout(() => {
        flightTimers.delete(t);
        fn();
      }, delay);
      flightTimers.add(t);
    }

    // Visits ride their own timer handle, NOT the interruptible pool: a player
    // click clears the pool, and that must never cancel the next visit. Called
    // at the moment a serpent despawns, so the 15-60s gap is serpent-free time
    // measured from when the previous one actually left the screen.
    let visitTimer: ReturnType<typeof setTimeout> | undefined;
    function scheduleVisit() {
      visitTimer = setTimeout(
        serpentVisit,
        VISIT_GAP_MIN_MS + Math.random() * VISIT_GAP_SPAN_MS,
      );
    }

    // One serpent visit — Gyarados and Rayquaza alternate. Both cruise the
    // same straight pass along the lane under the Rankings, entering from the
    // same side of the screen Clefairy is on, surfacing right beside her.
    // Once the serpent's head is actually on screen she bolts behind the
    // nearest card in one continuous dash, pops up for a
    // first nervous peek the moment she arrives, steals a second one later, and
    // on what would be the third she steps back out to roam — the serpent is
    // gone by then.
    function serpentVisit() {
      const cards = cardRects();
      if (!cards.length || document.hidden) {
        scheduleVisit(); // empty board or hidden tab: nowhere to hide — try later
        return;
      }
      const kind = visitKindRef.current;
      visitKindRef.current = (kind + 1) % SERPENTS.length;
      const dim = SERPENT_DIMS[kind];
      episodeRef.current = true;
      serpentGoneRef.current = false;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      flightTimers.forEach((t) => clearTimeout(t));
      flightTimers.clear();
      setEmote("none"); // cut short a dance/hop; fleeing overrides celebration
      setPeeking(false);

      // She bolts behind the card that just WON the last pick — the champion
      // is clearly the safest cover. Only when no winner is on the board (no
      // picks yet, or Keep Winner off just swapped the whole pair) does she
      // settle for the card nearest to where she's standing. One fast,
      // continuous run all the way there, with her first peek chained onto the
      // ARRIVAL (a fixed-time peek could fire mid-run and yank her to the card
      // top in a single 350ms hop: the "teleport"). The flee doesn't start at
      // visit time though: it's scheduled for when the serpent's head is
      // actually ~140px on screen plus a beat to "notice" it — she must react
      // to the monster, not to a timer the player can't see.
      const herX = xRef.current;
      const off = (c: CardRect) => Math.abs((c.left + c.right) / 2 - herX);
      const card = cards.find((c) => c.winner) ?? cards.reduce((a, b) => (off(a) <= off(b) ? a : b));
      const hide = hideSpotBehind(card);
      const flee = () => {
        // However far she is, she MUST be tucked in well before the serpent
        // finishes its pass: cover the distance in ~2.2s, never slower than
        // her usual 5x dash. (A fixed dash speed meant that on wide monitors
        // a far-corner flee outlasted the visit — she never hid at all.)
        const dist = Math.hypot(hide.x - xRef.current, hide.y - yRef.current);
        const speed = Math.max(WALK_SPEED * 5, dist / 2.2);
        walkTo(
          hide.x,
          hide.y,
          () => {
            // First peek chains onto the ARRIVAL; nervousPeek re-schedules
            // itself, so it keeps her peeking (or walks her off once the serpent
            // is gone) for the rest of the visit.
            nervousPeek(card, hide.y);
          },
          speed,
        );
      };

      const { w, h } = area();
      // Both serpents enter on the SAME side she's standing (her sprite
      // center vs the screen's center line): the menace surfaces right next
      // to her, then sweeps away across the stage.
      const herOnRight = herX + SPRITE_W / 2 > 0;

      // Both serpents fly the SAME path: one straight pass across the lane
      // under the Rankings (the rating dials below the cards), entering
      // on her side and despawning at the far edge — no return trip. The
      // lane is measured from the real board: top edge just below the lowest
      // dial, clamped so the body never clips through the floor.
      const dir: 1 | -1 = herOnRight ? -1 : 1;
      const startX = dir === 1 ? -w / 2 - dim.w - 24 : w / 2 + 24;
      const endX = dir === 1 ? w / 2 + 24 : -w / 2 - dim.w - 24;
      const lowest = Math.max(...cards.map((c) => c.roamBottom)); // dial nearest the floor
      // The serpent's positioner is BOTTOM-anchored (y places the sprite's
      // bottom edge, like hers), so the top edge rides at -y + stripH: seat
      // that 6px below the lowest dial, and never sink below the floor.
      const y = Math.min(0, lowest + 6 + dim.stripH);
      const crossMs = VISIT_MS - 600;
      const crossSpeed = Math.abs(endX - startX) / (crossMs / 1000);
      // She notices him once his head is well on screen (it spawns 24px off
      // the edge), then bolts.
      after(((24 + 140) / crossSpeed) * 1000 + 300, flee);
      serpentRef.current = { x: startX, y };
      setSerpent({ kind, x: startX, y, ms: 0, dir });
      flightAfter(60, () => {
        // One unbroken glide spanning the whole visit, then despawn (which
        // starts the serpent-free gap until the next visit).
        serpentGlide(endX, y, crossSpeed);
        flightAfter(crossMs + 80, () => {
          setSerpent(null);
          serpentGoneRef.current = true; // her next peek will see the coast is clear
          scheduleVisit();
        });
      });
      // Safety net only: the peek loop normally emerges her once the serpent is
      // gone (she peeks, sees it's clear, walks off). This fires late enough to
      // never preempt that peek-triggered exit, and just guarantees the episode
      // can't hang if a peek somehow never lands.
      after(VISIT_MS + 6500, emerge);
    }

    function act() {
      const { w } = area();
      const { xMax } = bounds();
      // Cards can mount OVER wherever she happens to stand — the board loads
      // after her, and filter changes remount it. If that happened (and no
      // serpent episode legitimately hid her), step out before doing anything.
      if (
        !episodeRef.current &&
        !clearOfCards(xRef.current, yRef.current, SPRITE_W, SPRITE_H, roamRects())
      ) {
        const spot = stepOutSpot();
        schedule(walkTo(spot.x, spot.y) + 300 + Math.random() * 700);
        return;
      }
      const roll = Math.random();
      if (roll < 0.5) {
        // Wander the open white space only (openMeadow keeps the target AND the
        // route clear of the board — she hides behind cards just for the serpents).
        const spot = openMeadow();
        schedule(walkTo(spot.x, spot.y) + 400 + Math.random() * 1600);
      } else if (roll < 0.58) {
        // Stroll off the left edge and reappear from the right: walk fully out,
        // snap (walkMs 0 = no transition) to just past the right edge while
        // hidden, then keep walking left back into view. The wrap is a straight
        // trek across the whole width, so only take it when that shoreline is
        // clear of the board at her height; otherwise wander instead.
        const cardsNow = roamRects();
        const shoreClear = pathClear(
          -w / 2,
          yRef.current,
          w / 2 - SPRITE_W,
          yRef.current,
          (x, y) => clearOfCards(x, y, SPRITE_W, SPRITE_H, cardsNow),
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
      // While a serpent owns the stage she's busy hiding — ignore the audience
      // (a pool clear here would tear the visit's choreography apart).
      if (episodeRef.current) return;
      // [role="button"] covers the interactive divs (the card pick targets):
      // without it a pick tap doubles as a walk command, and on a phone — where
      // the board spans nearly the full width — that sends her on a fast
      // floor-detour dash after every pick. Only open white space commands her.
      if ((e.target as Element | null)?.closest('button, [role="button"], a, input, select'))
        return;
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
      // during serpent visits, so stop her just below the slot (dial included).
      const cards = roamRects();
      const blocker = cards.find((c) => !clearOfCards(cx, cy, SPRITE_W, SPRITE_H, [c]));
      if (blocker) cy = Math.min(0, blocker.bottom + SPRITE_H + 6);
      // Commanded walks hustle at double the idle-wander toddle. If the straight
      // line to the target cuts behind the board, route around it through the
      // floor lane instead: drop to the floor, cross, then rise to the target.
      const clearHer = (x: number, y: number) => clearOfCards(x, y, SPRITE_W, SPRITE_H, cards);
      if (pathClear(xRef.current, yRef.current, cx, cy, clearHer)) {
        schedule(walkTo(cx, cy, undefined, WALK_SPEED * 2) + 600 + Math.random() * 1400);
      } else {
        walkTo(
          xRef.current,
          0,
          () =>
            walkTo(
              cx,
              0,
              () => walkTo(cx, cy, () => schedule(600 + Math.random() * 1400), WALK_SPEED * 2),
              WALK_SPEED * 2,
            ),
          WALK_SPEED * 2,
        );
      }
    }
    const screen = areaRef.current?.parentElement;
    screen?.addEventListener("click", onClick);

    // Watchdog: outside a serpent episode she must NEVER be behind the board.
    // act() checks this too, but only when it runs — cards can remount over
    // her (board load, filter change) or a resize can move the board onto a
    // spot she already holds, seconds before the next act. Poll her held spot
    // and bolt for the nearest clear one the moment it's covered. During any
    // walk her refs are the TARGET, so a walk-out already in flight reads as
    // clear and isn't restarted.
    const watchdog = setInterval(() => {
      if (episodeRef.current) return;
      if (clearOfCards(xRef.current, yRef.current, SPRITE_W, SPRITE_H, roamRects())) return;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      setPeeking(false);
      const spot = stepOutSpot();
      schedule(walkTo(spot.x, spot.y, undefined, WALK_SPEED * 2) + 400 + Math.random() * 800);
    }, 900);

    // Clean slate on (re)mount: a dev hot-reload can land MID-VISIT — the old
    // effect's cleanup kills the flight timers but React preserves the
    // serpent/peeking state and refs, leaving a ghost serpent frozen on
    // screen and episodeRef stuck true (which would mute clicks and the
    // watchdog for good). Reset all of it before the fresh brain starts.
    episodeRef.current = false;
    setSerpent(null);
    setPeeking(false);

    schedule(1500);
    scheduleVisit();
    return () => {
      screen?.removeEventListener("click", onClick);
      clearInterval(watchdog);
      timers.forEach((t) => clearTimeout(t));
      flightTimers.forEach((t) => clearTimeout(t));
      clearTimeout(visitTimer);
    };
  }, []);

  // Motion sampler: read the animating transform a few times a second and
  // compare against the last sample. This is the source of truth for whether
  // she is moving (and so whether her feet should step).
  useEffect(() => {
    let lastX = NaN;
    let lastY = NaN;
    const timer = setInterval(() => {
      const el = posRef.current;
      if (!el) return;
      const t = getComputedStyle(el).transform;
      if (!t || t === "none") return;
      const m = new DOMMatrixReadOnly(t);
      const d = Math.hypot(m.m41 - lastX, m.m42 - lastY);
      lastX = m.m41;
      lastY = m.m42;
      setMoving(Number.isFinite(d) && d > 1);
    }, 140);
    return () => clearInterval(timer);
  }, []);

  // Step cadence: alternate feet while she's in motion. 160ms/step suits the
  // toddle speed (~2 steps per 13px of travel at WALK_SPEED); the interval dies
  // with the motion so she always plants both feet when she stops.
  useEffect(() => {
    if (!moving) return;
    const timer = setInterval(() => setStepFrame((frame) => frame ^ 1), 160);
    return () => clearInterval(timer);
  }, [moving]);

  // Nervous eye darting: flick the pupils left/right while she peeks for a serpent.
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
  // Peeks only happen while a serpent prowls, so they always wear the nervous eyes.
  const rows = peeking
    ? NERVOUS_PEEK[dartFrame]
    : moving
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
                <div className={moving ? "clefairy-waddle" : "critter-idle"}>
                  <PixelArt rows={rows} scale={DISPLAY_SCALE} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The visiting serpent: same bottom-center anchor and glide scheme as
          her positioner. One traced sprite that natively faces right (mirrored
          with scaleX for leftward travel) and snakes as it swims — its vertical
          column-bands run a traveling sine (see SnakeSprite). */}
      {serpent && (
        <div className="absolute bottom-6 left-1/2">
          <div
            style={{
              transform: `translate(${serpent.x}px, ${serpent.y}px)`,
              transition: `transform ${serpent.ms}ms ease-in-out`,
            }}
          >
            <div style={{ transform: `scaleX(${serpent.dir})` }}>
              <SnakeSprite kind={serpent.kind} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
