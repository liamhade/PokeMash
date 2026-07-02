// Top-down (bird's-eye) Gyarados, drawn as 24-row pieces that the play screen
// composes into a strip — tail fan, stem, body slices, neck, head — laid along
// +x and rotated to his travel heading. Modeled on the official top-down render:
// radiating crest horns swept back off the head, big white jagged fins behind
// the neck, cream belly-plate crescents at every segment joint, small ruffle
// fins on the rear third, and the serrated two-pronged caudal fan.
//
// Every piece is authored as a 12-row top half and mirrored about the
// horizontal midline, so the strip is symmetric and any runtime heading works.
// Pieces paint tail->head; each piece's left columns overlap its tail-side
// neighbor and must visually continue it.
//
// Legend: k outline black | B body blue | L light dorsal highlight | N dark
// crest blue | W fin white | w fin lavender shade | c belly cream | r eye red.
export const GYARADOS_PALETTE: Record<string, string> = {
  k: "#101820",
  B: "#1890B0",
  L: "#30B8E0",
  N: "#106080",
  W: "#F8F8F8",
  w: "#C8C8E8",
  c: "#F0E0B8",
  r: "#E03028",
};

function mirror(top: string[]): string[] {
  return [...top, ...[...top].reverse()];
}

// Head, 26 wide: tube-blue left columns so the neck flows in, long swept-back
// crest horns, the crest diamond at the center-back, red eye ridges near the
// snout sides, a nostril dot, and whisker barbels trailing the jaw.
export const GYARADOS_HEAD = mirror([
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

// Neck, 16 wide: the big white jagged fins right behind the head.
export const GYARADOS_NECK = mirror([
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

// Body slice, 14 wide: cream belly-plate crescent at the left (tail-side)
// joint, light dorsal highlight along the flanks.
export const GYARADOS_SEG = mirror([
  "..............",
  "..............",
  "..............",
  "..............",
  "..............",
  "..............",
  "kkkkkkkkkkkkkk",
  "ccBLLBBBBBLLBB",
  "ccBBBBBBBBBBBB",
  "cBBBBBBBBBBBBB",
  "cBBBBBBBBBBBBB",
  "cBBBBBBBBBBBBB",
]);

// Body slice with the small grey-white ruffle fins of the rear third.
export const GYARADOS_SEG_RUFFLE = mirror([
  "..............",
  "....kk........",
  "...kwWk..kk...",
  "...kwWWkkwWk..",
  "..kwWWWWwWWk..",
  "..kkWWWWWWWkk.",
  "kkkkkkkkkkkkkk",
  "ccBLLBBBBBLLBB",
  "ccBBBBBBBBBBBB",
  "cBBBBBBBBBBBBB",
  "cBBBBBBBBBBBBB",
  "cBBBBBBBBBBBBB",
]);

// Thin tail stem before the fan.
export const GYARADOS_STEM = mirror([
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "............",
  "kkkkkkkkkkkk",
  "ccBBBBBBBBBB",
  "cBBBBBBBBBBB",
]);

// Caudal fan, 24 wide: two swept prongs with lavender webbing between, a ragged
// serrated trailing edge, and the hub at the right connecting to the stem.
export const GYARADOS_FAN = mirror([
  "..kk....................",
  ".kBBkk..................",
  ".kBBBBkk................",
  "..kkBBBBkk..............",
  ".kwwkkBBBBkk............",
  "..kwwwkkBBBBkk..........",
  ".kwwwwwkkBBBBkk.........",
  "..kwwwwwwkkBBBBkk.......",
  ".kwwwwwwwwkkBBBBkkk.....",
  "..kwwwwwwwwwkBBBBBBkkkkk",
  ".kwwwwwwwwwwwkBBBBBBBBBB",
  "..kwwwwwwwwwwwkBBBBBBBBB",
]);
