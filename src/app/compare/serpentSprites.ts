// The legendary serpents that raid the play area: Gyarados and Rayquaza.
// Each has a front-view FACE (shown while it bursts in, before rolling over to
// swim) and a top-down strip of pieces laid tail->head along +x, rotated at
// runtime to the travel heading and undulated per piece into a traveling wave.
//
// Strips are authored as 12-row top halves and mirrored about the horizontal
// midline (so any heading works without a flip); faces are authored as left
// halves and mirrored about the vertical midline (a face looks at the viewer,
// so it must be left-right symmetric). Pieces paint tail->head: each piece's
// left columns overlap its tail-side neighbor and must visually continue it.
// Slices are deliberately NARROW (8 cells): the per-piece wave phase lag is
// small between neighbors, so joints can't drift apart and "disconnect".
//
// Gyarados legend: k outline | B body blue | L highlight | N crest navy |
// W fin white | w fin lavender | c belly cream | r eye red | R maw dark red.
// Rayquaza legend: k outline | G body green | E lime highlight | D dark green |
// Y ring yellow | R accent red | W fang white | m maw dark red.
const mirrorRows = (top: string[]): string[] => [...top, ...[...top].reverse()];
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



// ---------- gyarados strip (24 rows; tube rows 6-17) ----------
const GY_HEAD = mirrorRows([
  "kkk.......................",
  "kNNkkk......kk............",
  ".kkNNNkk...kNNk...........",
  "...kkNNNk..kNNNk..........",
  ".....kkNkkkkNNkkkkkk......",
  "......kkBBBBBBBBBBBkkk....",
  "kkkkkkBBBBBBBBBBBBBBBkk...",
  "BBBBBBBBBBBBBBBBBBBBBBkk..",
  "BBBBBNBBBBBBBBBBBBBBBBBk..",
  "BBBBNNNBBBBBBBBBBrrBBBBk..",
  "BBBBNNNNBBBBBBBBBrrBBkBkW.",
  "BBBBNNNNNBBBBBBBBBBBBBBkW.",
]);
const GY_NECK = mirrorRows([
  "....kk..........",
  "...kWWkk...kk...",
  "...kWWWWk.kWWk..",
  "..kWWWWWWkkWWWk.",
  "..kWWWWWWWWWWWk.",
  ".kkWWWWWWWWWWWkk",
  "kkkkkkkkkkkkkkkk",
  "BBLLBBBBBBLLBBBB",
  "BBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBB",
]);
// 8-wide slices: plain, joint (cream crescent), ruffle (small white fins).
const GY_SLICE = mirrorRows([
  "........", "........", "........", "........", "........", "........",
  "kkkkkkkk", "BLLBBBBB", "BBBBBBBB", "BBBBBBBB", "BBBBBBBB", "BBBBBBBB",
]);
const GY_SLICE_JOINT = mirrorRows([
  "........", "........", "........", "........", "........", "........",
  "kkkkkkkk", "ccBLLBBB", "ccBBBBBB", "cBBBBBBB", "cBBBBBBB", "cBBBBBBB",
]);
const GY_SLICE_RUFFLE = mirrorRows([
  "........", "..kk....", ".kwWk...", ".kwWWkk.", "kkWWWWk.", ".kkWWWkk",
  "kkkkkkkk", "ccBLLBBB", "ccBBBBBB", "cBBBBBBB", "cBBBBBBB", "cBBBBBBB",
]);
// Stem: thicker than before (tube rows 8-15) so joint offsets can't open gaps.
const GY_STEM = mirrorRows([
  "..........", "..........", "..........", "..........", "..........",
  "..........", "..........", "..........",
  "kkkkkkkkkk", "ccBBBBBBBB", "cBBBBBBBBB", "cBBBBBBBBB",
]);
const GY_FAN = mirrorRows([
  "..kk....................",
  ".kBBkk..................",
  ".kBBBBkk................",
  "..kkBBBBkk..............",
  ".kwwkkBBBBkk............",
  "..kwwwkkBBBBkk..........",
  ".kwwwwwkkBBBBkk.........",
  "..kwwwwwwkkBBBBkkk......",
  ".kwwwwwwwwkkBBBBBkkkk...",
  "..kwwwwwwwwwkBBBBBBBkkkk",
  ".kwwwwwwwwwwwkBBBBBBBBBB",
  "..kwwwwwwwwwwwkBBBBBBBBB",
]);

// ---------- gyarados front face (28 wide, 26 tall) ----------
const GY_FACE = mirrorCols([
  "..............",
  "...........kkk",
  "..........kNNN",
  "...kkk....kNNN",
  "..kNNNk...kkNN",
  "..kNNNNk....kk",
  "...kkNNNkkkkkB",
  ".....kkBBBBBBB",
  "....kBBBBBBBBB",
  "...kBBBBBBBBBB",
  "...kBBrrBBBBBB",
  "..kBBBrrBBBBBB",
  "..kBBBBBkkkkkk",
  "..kBBBkkWWWWWW",
  ".kwkBkWWWWWWWW",
  ".kwkBkWRWRRWRR",
  "kwwkBkRRRRRRRR",
  "kwkkBkRRRRRRRR",
  "kwk.kBkRRRRRRR",
  "kwk.kBkRRRRRRR",
  ".kk.kBkkRWRRWR",
  "....kBBkkWWWWW",
  ".....kBBBkkkkk",
  "......kBBBBBBB",
  ".......kkBBBBB",
  ".........kkkkk",
]);

// ---------- rayquaza strip (24 rows; tube rows 6-17) ----------
// Head: elongated, horns swept back with red trailing edges, yellow eyes.
const RAY_HEAD = mirrorRows([
  "kkk.......................",
  "kRGkkk......kk............",
  ".kkGGGkk...kGGk...........",
  "...kkRGGk..kRGGk..........",
  ".....kkGkkkkGGkkkkkk......",
  "......kkGGGGGGGGGGGkkk....",
  "kkkkkkGGGGGGGGGGGGGGGkk...",
  "GGGGGGGGGGGGGGGGGGGGGGkk..",
  "GGGGGDGGGGGGGGGGGGGGGGGk..",
  "GGGGDDDGGGGGGGGGGYYGGGGk..",
  "GGGGDDDDGGGGGGGGGYYGGkGkR.",
  "GGGGDDDDDGGGGGGGGGGGGGGkR.",
]);
// Slices: plain, ring (yellow band marking), fin (red-tipped side fins).
const RAY_SLICE = mirrorRows([
  "........", "........", "........", "........", "........", "........",
  "kkkkkkkk", "GEEGGGGG", "GGGGGGGG", "GGGGGGGG", "GGGGGGGG", "DGGGGGGG",
]);
const RAY_SLICE_RING = mirrorRows([
  "........", "........", "........", "........", "........", "........",
  "kkkkkkkk", "GEYYEGGG", "GYYGGGGG", "GYGGGGGG", "GYGGGGGG", "DYGGGGGG",
]);
const RAY_SLICE_FIN = mirrorRows([
  "........", "..kkk...", ".kRRGk..", ".kRGGkk.", "kkGGGGk.", ".kkGGGkk",
  "kkkkkkkk", "GEEGGGGG", "GGGGGGGG", "GGGGGGGG", "GGGGGGGG", "DGGGGGGG",
]);
const RAY_STEM = mirrorRows([
  "..........", "..........", "..........", "..........", "..........",
  "..........", "..........", "..........",
  "kkkkkkkkkk", "GGGGGGGGGG", "GGGGGGGGGG", "DGGGGGGGGG",
]);
// Tail tip: thin taper ending in the twin red-tipped blades.
const RAY_FAN = mirrorRows([
  "kkk.....................",
  "kRRkk...................",
  "kRRGGkk.................",
  ".kRGGGGkk...............",
  "..kkGGGGGkk.............",
  "....kkGGGGGkk...........",
  "......kkGGGGGkkkk.......",
  ".......kkGGGGGGGGkkkk...",
  ".........kkGGGGGGGGGkkkk",
  "...........kkGGGGGGGGGGG",
  "..........kGGGGGGGGGGGGG",
  "...........kGGGGGGGGGGGG",
]);

// ---------- rayquaza front face (28 wide, 24 tall) ----------
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
  face: string[];
  // tail -> head; amp is each piece's undulation amplitude in px (the wave
  // grows toward the tail for big whole-body strokes).
  pieces: SerpentPiece[];
};

export const SERPENTS: SerpentSprite[] = [
  {
    name: "gyarados",
    palette: GY_HEX,
    face: GY_FACE,
    pieces: [
      { rows: GY_FAN, amp: 26 },
      { rows: GY_STEM, amp: 22 },
      { rows: GY_SLICE_JOINT, amp: 18 },
      { rows: GY_SLICE_RUFFLE, amp: 15 },
      { rows: GY_SLICE_JOINT, amp: 12 },
      { rows: GY_SLICE, amp: 9 },
      { rows: GY_SLICE_JOINT, amp: 7 },
      { rows: GY_SLICE, amp: 5 },
      { rows: GY_NECK, amp: 3 },
      { rows: GY_HEAD, amp: 2 },
    ],
  },
  {
    name: "rayquaza",
    palette: RAY_HEX,
    face: RAY_FACE,
    pieces: [
      { rows: RAY_FAN, amp: 26 },
      { rows: RAY_STEM, amp: 22 },
      { rows: RAY_SLICE_RING, amp: 18 },
      { rows: RAY_SLICE_FIN, amp: 15 },
      { rows: RAY_SLICE, amp: 12 },
      { rows: RAY_SLICE_RING, amp: 9 },
      { rows: RAY_SLICE_FIN, amp: 7 },
      { rows: RAY_SLICE_RING, amp: 5 },
      { rows: RAY_SLICE, amp: 3 },
      { rows: RAY_HEAD, amp: 2 },
    ],
  },
];
