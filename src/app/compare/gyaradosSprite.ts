// Top-down (bird's-eye) Gyarados, drawn as three 16x16 pieces that the play
// screen composes into a strip — tail, body segments, head — laid along +x and
// rotated to his travel heading. Each piece undulates across the travel axis
// with a phase lag, so the body snakes like a slow wave. Authored by hand and
// tuned against PNG renders (the side-view chart can't be re-projected).
//
// Legend: k outline black | B body blue | L light blue highlight | N dark crest
// blue | W fin white / whisker | w fin lavender shade | y pale back spots |
// r eye red. The head points RIGHT; the runtime rotation supplies every other
// heading, so each piece is symmetric about its horizontal midline.
export const GYARADOS_PALETTE: Record<string, string> = {
  k: "#101820",
  B: "#1890B0",
  L: "#30B8E0",
  N: "#106080",
  W: "#F8F8F8",
  w: "#C8C8E8",
  y: "#F0F0B0",
  r: "#E03028",
};

// Head from above: blunt snout, red eye ridges at the front sides, the dark
// crest tapering back down the centerline, whisker barbels trailing the jaw.
export const GYARADOS_HEAD = [
  "................",
  "................",
  "....kkkkkk......",
  "..kkBLLLLBkk....",
  ".kBLBBBBBBBBkkW.",
  ".kBBBBBBBBBBBkWk",
  "kBNNBBBBBBrrBk..",
  "kBNNNNNBBBBBBBk.",
  "kBNNNNNNNBBBBBk.",
  "kBNNNNNNNBBBBBk.",
  "kBNNNNNBBBBBBBk.",
  "kBNNBBBBBBrrBk..",
  ".kBBBBBBBBBBBkWk",
  ".kBLBBBBBBBBkkW.",
  "..kkBLLLLBkk....",
  "....kkkkkk......",
];

// One body slice: outlined only along the flanks (top/bottom rows) so adjoining
// slices merge into one unbroken tube; white dorsal-fin diamonds ride the spine
// and pale spots dust the back.
export const GYARADOS_SEGMENT = [
  "................",
  "................",
  "kkkkkkkkkkkkkkkk",
  "BLLBBBBBBLLBBBBB",
  "BBByBBBBBBBBByBB",
  "BBBBBBBByBBBBBBB",
  "BBBBBWWBBBBBWWBB",
  "BBBBWWWWBBBWWWWB",
  "BBBBWWWWBBBWWWWB",
  "BBBBBWWBBBBBWWBB",
  "ByBBBBBBBByBBBBB",
  "BBBBBBByBBBBBBBB",
  "BLLBBBBBBLLBBBBB",
  "kkkkkkkkkkkkkkkk",
  "................",
  "................",
];

// Tail: the blue stub opens into the caudal fan — a backward-pointing V from
// above — white with lavender shading toward the trailing edge.
export const GYARADOS_TAIL = [
  "................",
  "kk..............",
  "kWWkk...........",
  "kWWWWkk.........",
  ".kWWWWWWkk......",
  ".kwWWWWWWWkkkkkk",
  "..kwwWWWWWWBBBBB",
  "..kwwwWWWWWBBBBB",
  "..kwwwWWWWWBBBBB",
  "..kwwWWWWWWBBBBB",
  ".kwWWWWWWWkkkkkk",
  ".kWWWWWWkk......",
  "kWWWWkk.........",
  "kWWkk...........",
  "kk..............",
  "................",
];
