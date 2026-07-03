// The legendary serpents that raid the play area: Gyarados and Rayquaza,
// both drawn in SIDE PROFILE (dorsal fins up, belly down) as strips of 24-row
// pieces laid tail->head along +x. Travel direction is a plain horizontal flip
// (side views have a real up, so no rotation). Rayquaza also has a front-view
// FACE for his glaring entrance; Gyarados skips the face and simply cruises
// straight across. Slices are deliberately NARROW (8 cells): the per-piece wave
// phase lag stays small between neighbors, so joints can't visibly disconnect.
//
// Gyarados legend: k outline | B body blue | L highlight | N crest navy |
// W fin white | w barbel lavender | c belly cream | r eye red | R maw dark red.
// Rayquaza legend: k outline | G body green | E lime highlight | D dark green |
// Y ring yellow | R accent red | W fang white | m maw dark red.
const mirrorCols = (half: string[]): string[] =>
  half.map((row) => row + [...row].reverse().join(""));

const GY_HEX: Record<string, string> = {
  k: "#101820", B: "#1890B0", L: "#30B8E0", N: "#106080",
  W: "#F8F8F8", w: "#C8C8E8", c: "#F0E0B8", r: "#E03028", R: "#881818",
};
const RAY_HEX: Record<string, string> = {
  k: "#101820", G: "#2E9E48", E: "#58C868", D: "#1F6E34",
  Y: "#F0D830", R: "#D82830", W: "#F8F8F8", m: "#881818",
};

// Gyarados body slice: blue back over the cream belly band.
const GS_SLICE = [
  "........",
  "........",
  "........",
  "........",
  "........",
  "kkkkkkkk",
  "BLLBBBBB",
  "BBBBBBBB",
  "BBBBBBBB",
  "BBBBBBBB",
  "BBBBBBBB",
  "BBBBBBBB",
  "BBBBBBBB",
  "BBBBBBBB",
  "cccccccc",
  "cccccccc",
  "cccccccc",
  "cccccccc",
  "kkkkkkkk",
  "........",
  "........",
  "........",
  "........",
  "........",
];

// Gyarados segment joint: the dark arc between body segments.
const GS_JOINT = [
  "........",
  "........",
  "........",
  "........",
  "........",
  "kkkkkkkk",
  ".kLBBBBB",
  ".kBBBBBB",
  "kBBBBBBB",
  "kBBBBBBB",
  "kBBBBBBB",
  "kBBBBBBB",
  ".kBBBBBB",
  ".kBBBBBB",
  ".kcccccc",
  "kccccccc",
  "kccccccc",
  ".kcccccc",
  "kkkkkkkk",
  "........",
  "........",
  "........",
  "........",
  "........",
];

// Gyarados joint slice with a white jagged dorsal fin.
const GS_FIN = [
  ".kk..k..",
  "kWWk.kk.",
  "kWWWkkWk",
  ".kWWWWWk",
  ".kkWWWkk",
  "kkkkkkkk",
  ".kLBBBBB",
  ".kBBBBBB",
  "kBBBBBBB",
  "kBBBBBBB",
  "kBBBBBBB",
  "kBBBBBBB",
  ".kBBBBBB",
  ".kBBBBBB",
  ".kcccccc",
  "kccccccc",
  "kccccccc",
  ".kcccccc",
  "kkkkkkkk",
  "........",
  "........",
  "........",
  "........",
  "........",
];

// Gyarados forked caudal fan: two blades opening back, ragged edges.
const GS_FAN = [
  "....................",
  "kk..................",
  "kBkk................",
  "kBBBkk..............",
  ".kBBBBkk............",
  "kkBBBBBBkk..........",
  ".kBBBBBBBBkkkkkkkkkk",
  "kkBBBBBBBBBBBBBBBBBB",
  ".kkBBBBBBBBBBBBBBBBB",
  "..kBBBBBBBBBBBBBBBBB",
  ".kkBBBBBBBBBBBBBBBBB",
  "..kBBBBBBBBBBBBBBBBB",
  ".kkBBBBBBBBBBBBBBBBB",
  "..kBBBBBBBBBBBBBBBBB",
  ".kBBBBBBBBBBBBBBcccc",
  "kkBBBBBBBBkkkkkkcccc",
  ".kBBBBBBkk......cccc",
  "kBBBBkk.........cccc",
  "kBBkk...........kkkk",
  "kkk.................",
  "....................",
  "....................",
  "....................",
  "....................",
];

// Gyarados head profile: teal crest swept back, red eye, gaping jaw —
// white fangs around the dark red maw — cream cheek, barbel off the chin.
const GS_HEAD = [
  "........kkk.....................",
  "......kkNNNkkk..................",
  ".....kNNNNNNNNkk................",
  "......kkNNNNNNNNkk..............",
  "........kkNNNNNNNNk.............",
  "kkkkkk....kBBBBBBBBkkk..........",
  "BLLBBBk..kBBBBBBBBBBBBkk........",
  "BBBBBBBkkBBBBBBBBBBBBBBBkk......",
  "BBBBBBBBBBBBBBBBBBBkrrBBBkk.....",
  "BBBBBBBBBBBBBBBBBBBkrrBBBBBkk...",
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBkk.",
  "BBBBBBBBcccBBBBBBBBBBBBBBBBBBBBk",
  "BBBBBBBcccccBBBBBBkkkkkkkkkkkkk.",
  "BBBBBBcccccccBBBkBWkWkWkWkWkkk..",
  "ccccccccccccccBkRRRRRRRRRRRRk...",
  "cccccccccccccckRRRRRRRRRRRRRRk..",
  "ccccccccccccckRRRRRRRRRRRRRk....",
  "cccccccccccckcWkWkWkWkWkWkk.....",
  "kkkkkkkkkkkkkccccccccccccck.....",
  ".........kwkkkcccccccccckk......",
  ".........kwk..kkkkkkkkkk........",
  "..........kwk...................",
  "..........kwwk..................",
  "...........kk...................",
];

// Rayquaza body slice: green back, dark keel below.
const RS_SLICE = [
  "........",
  "........",
  "........",
  "........",
  "........",
  "kkkkkkkk",
  "GEEGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "DGGGGGGD",
  "DDGGGGDD",
  "DDDDDDDD",
  "kkkkkkkk",
  "........",
  "........",
  "........",
  "........",
  "........",
];

// Rayquaza slice with the yellow ring marking on the flank.
const RS_RING = [
  "........",
  "........",
  "........",
  "........",
  "........",
  "kkkkkkkk",
  "GEEGGGGG",
  "GGYYYYGG",
  "GYYGGYYG",
  "GYGGGGYG",
  "GYGGGGYG",
  "GYYGGYYG",
  "GGYYYYGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "DGGGGGGD",
  "DDGGGGDD",
  "DDDDDDDD",
  "kkkkkkkk",
  "........",
  "........",
  "........",
  "........",
  "........",
];

// Rayquaza slice with the red-rimmed fin plates, one up and one down.
const RS_FIN = [
  ".kkkkkk.",
  "kGGGGRRk",
  "kGGGGRRk",
  "kGGGGRRk",
  ".kGGGRk.",
  "kkkkkkkk",
  "GEEGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "GGGGGGGG",
  "DGGGGGGD",
  "DDGGGGDD",
  "DDDDDDDD",
  "kkkkkkkk",
  ".kGGGRk.",
  "kGGGGRRk",
  "kGGGGRRk",
  "kGGGGRRk",
  ".kkkkkk.",
];

// Rayquaza tail tip: tapering tube with the red strake and twin end blades.
const RS_TIP = [
  "................",
  "kk..............",
  "kGkk............",
  ".kGGkk..........",
  "..kkGGk.........",
  "....kkkkkkkkkkkk",
  ".....kGGEEGGGGGG",
  "..kkkGGGGGGGGGGG",
  ".kGGGGRRRRRGGGGG",
  "kGGRRRRGGGGGGGGG",
  "kGGRRRRGGGGGGGGG",
  ".kGGGGRRRRRGGGGG",
  "..kkkGGGGGGGGGGG",
  ".....kGGGGGGGGGG",
  "....kkkkkkDDGGGG",
  "..kkGGk...kDDDDD",
  ".kGGkk.....kkkkk",
  "kGkk............",
  "kk..............",
  "................",
  "................",
  "................",
  "................",
  "................",
];

// Rayquaza head profile: backswept crest blade, yellow eye, open red mouth
// with a white fang, dark jawline.
const RS_HEAD = [
  "............kkk...............",
  ".........kkkGGGkk.............",
  ".......kkGGGGGGGGkk...........",
  ".....kkGGGGGGGGGGGGk..........",
  "....kkkkkkGGGGGGGGGGk.........",
  "kkkkkk...kkGGGGGGGGGGkkk......",
  "GEEGGGk.kGGGGGGGGGGGGGGGkk....",
  "GGGGGGGkGGGGGGGGGGGGGGGGGGkk..",
  "GGGGGGGGGGGGGGGGGGGkYYkGGGGkk.",
  "GGGGGGGGGGGGGGGGGGGkYkkGGGGGk.",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGk",
  "GGGGGGGGGGGGGGGGGGkkkkkkkkkkk.",
  "GGGGGGGGGGGGGGGGkmmmmmmmmmmk..",
  "GGGGGGGGGGGGGGGkmmmmWkmmmmk...",
  "GGGGGGGGGGGGGGkmmmmmmmmmmk....",
  "GGGGGGGGGGGGGkDDmmmmmmmkk.....",
  "DGGGGGGGGGGGkDDDDDDDDDkk......",
  "DDGGGGGGGGGGkkDDDDDDkk........",
  "kkkkkkkkkkkkkkkkkkkkk.........",
  "..............................",
  "..............................",
  "..............................",
  "..............................",
  "..............................",
];

// Rayquaza's glaring front face, shown while he looms in before the roll to
// the side view (authored as a left half, mirrored about the vertical axis).
const RAY_FACE = mirrorCols([
  "..............",
  "..kkk.........",
  ".kRRGk........",
  ".kRGGGk.......",
  "..kkGGGkkkkk..",
  "....kkGGGGGGkk",
  ".....kGGGGGGGG",
  "....kGGGGGGGGG",
  "...kGGYYGGGGGG",
  "...kGGYYGGGGGG",
  "..kGGGGGkkkkkk",
  "..kGGGkkWWWWWW",
  ".kGGGkWWmmmmmm",
  ".kGGkWmWmmWmmW",
  ".kGGkWmmmmmmmm",
  ".kGGkWWmWmmWmm",
  "..kGGkkWWWWWWW",
  "...kGGGkkkkkkk",
  "....kGGGGGGGGG",
  ".....kkGGGGGGG",
  ".......kkGGGGG",
  ".........kkkkk",
  "..............",
  "..............",
]);

export type SerpentPiece = { rows: string[]; amp: number };
export type SerpentSprite = {
  name: string;
  palette: Record<string, string>;
  // "cross": no entrance pose; swims straight across at a fixed height,
  // alternating direction. "prowl": face-first entrance, belly roll, dive and
  // open-water wander.
  behavior: "cross" | "prowl";
  face?: string[];
  // tail -> head; amp is each piece's undulation amplitude in DESIGN px
  // (scaled up with the sprite at render time).
  pieces: SerpentPiece[];
};

export const SERPENTS: SerpentSprite[] = [
  {
    name: "gyarados",
    palette: GY_HEX,
    behavior: "cross",
    pieces: [
      { rows: GS_FAN, amp: 26 },
      { rows: GS_JOINT, amp: 22 },
      { rows: GS_SLICE, amp: 18 },
      { rows: GS_FIN, amp: 15 },
      { rows: GS_JOINT, amp: 12 },
      { rows: GS_SLICE, amp: 9 },
      { rows: GS_JOINT, amp: 7 },
      { rows: GS_SLICE, amp: 5 },
      { rows: GS_FIN, amp: 3 },
      { rows: GS_HEAD, amp: 2 },
    ],
  },
  {
    name: "rayquaza",
    palette: RAY_HEX,
    behavior: "prowl",
    face: RAY_FACE,
    pieces: [
      { rows: RS_TIP, amp: 26 },
      { rows: RS_RING, amp: 22 },
      { rows: RS_FIN, amp: 18 },
      { rows: RS_RING, amp: 15 },
      { rows: RS_SLICE, amp: 12 },
      { rows: RS_RING, amp: 9 },
      { rows: RS_FIN, amp: 7 },
      { rows: RS_RING, amp: 5 },
      { rows: RS_SLICE, amp: 3 },
      { rows: RS_HEAD, amp: 2 },
    ],
  },
];
