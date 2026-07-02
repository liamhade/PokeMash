// Gyarados, machine-extracted from a gridded pixel chart (same pipeline as the
// Clefairy sprite: brute-forced gridline pitch/offset, per-cell median color over
// the cell's center region, quantized to the anchors below, background removed by
// flood-filling border-connected white so the white FINS survive).
//
// Legend: k outline black | B body blue | L light blue | C bright cyan | N dark
// blue | E darkest navy | W fin white | w fin lavender | g fin grey | t belly tan |
// T belly shade | y pale spots | b belly dark | R mouth dark red | r eye red |
// O tongue orange. The art natively faces LEFT (head at bottom-left, tail fan at
// top-right).
export const GYARADOS_PALETTE: Record<string, string> = {
  k: "#101820",
  B: "#1890B0",
  L: "#30B8E0",
  C: "#60D8F0",
  N: "#106080",
  E: "#083048",
  W: "#F8F8F8",
  w: "#C8C8E8",
  g: "#787888",
  t: "#E0C880",
  T: "#C8A068",
  y: "#F0F0B0",
  b: "#604818",
  R: "#881818",
  r: "#E03028",
  O: "#F07030",
};

const GYARADOS_SPRITE = [
  ".........................................................................k.......",
  ".........................................................................Nk......",
  "........................................................................gwNk.....",
  "......................................................................g.gwNk.....",
  "........................................NNNN.....................NN..gwggwwNk....",
  "......................................NNLLLLBN...................NBNggwwgwwNN....",
  ".....................g.............BNNNLLLLLLLBN.................gNBNwwwwwwgNk...",
  "....................gWg..........BBLLLLkNLLLLLLLNN..........Ngg..gNBBNwwwwwwNk...",
  "...................gWWWg....g..BBCCCLLLLLkLLLLLLELB.........NNwggwwNBBNwwwwwNN...",
  "....................gWWw...gwkBCCCCCCLLLLLNLLLLLLBLN.........NwwgwwwNBBNwwwwgE...",
  "....................gWWWg.gwwkCCCCCCCLLLLLNLLLLLLNLLN........NNwwwwwNBBNNwwwwNk..",
  ".....................gWWWgkwwkCCCCCCLLLLLLLNyyyLLNLLN.........NNwwwwwNBBNwwwwNk..",
  "......................gWWWgwwkCCCCLLLLLLLLLEyyyyLNyLLk.........NNwwwwwNBBNwwwNk..",
  "......................gWWWwgwkCLLLLLLLyyLLLNyyyyLNyyLk..........NNwwwwNBBNwwwNN..",
  ".......................gWWwwwkLLLLLLyyyyyLLBNyyLBNyyyLk..........NNgwwwNBBEwgNN..",
  "....................gkkgWwwwwwkBBLLyyyyyyLLBNLLBBEyyTLk...........NNNwwNBBNwgNN..",
  "...................gWWWggwwwwwNLLBBLyyyyLLLBEBBBBETtBBk.............NNgwNBNNNN...",
  "...................gWWWWWwwwwwwNLLLNkyyLLLBBEBtTNBBBBBk..............NNNNBNNNk...",
  "....................gkWWWWwwwwNLLLLLBkLLBBBBNTtTNBBBBBk................EENNNNk...",
  ".................g....kWWWwwwELLLLLLLkBBBBTbTTTbtBBBBBk.................NNEkkk...",
  ".........g......gwk...kkwWwwELLLLLLLLBkBttTbTttbTtBBBEk..................NkBNkE..",
  "........gWgk...gwwk..kBkwwwwNLLLLLLLBBkttttbTtbtTtBBBNBk..................NBNTNk.",
  ".......gWWWWgk..gwwk.kBBkwwNLLLLLLLLBBBkTtbttbttTTBBNTBk.......g.........NBBTTNk.",
  "........gWWWWWkkgwwwkkBBkwwELLLLLLLBBBBktTbbbtttTTtNTtBBk.....gWg........NBBTbNk.",
  ".........ggWWWWwkgwwwkBBBNwBLLLLLLLBBBtkTbkTttTttkNTttTBk.....gWWk...g.g..kkkNN..",
  "...........gWWWWWwggwwNBBBNBBLLLLLBBBBttkkbttTTkkBBBttTBk....gWWWkk.gwgwg.kBBBBE.",
  "............ggWWWwwwwwwNNNNNkBLLLBBBBBTtkTTbkkbttTBBTtTBk....gWWgkwkwwgwgNNBBBBBN",
  "..............gWWwwwwwwwNBLLLNkBBBBBBTTbkTtTttttTtBBBTBBk....gWWgwwkwwwgwNBBBBBBN",
  "............gggWwwwwwwwwNLLLLLBBkBBkkkkkWbTTTTTTTTTBBBBk.....gWWWwkgwwwgwNBBBBBTk",
  "...........gWWWggwwwwwwNLLLLLLLLBkkLLLBkWbTTtTttTtTBBBkTk...gWWWwwkgwwwwwNBBBBtTk",
  "...........gWWWWWWwwwwwNLLLLLLLLBLLLLLBkWWktttttTttBkkTttkg.gWWWwkgwkwwwwNkkkNTbk",
  "............ggWWNWWwwwwgLLLLLLLBLLLLLBBkWWWbbTtTTtbbBBBTtkWggWWwwkwwkkwwwEBBBNNb.",
  "..............gNBNWwwwNLLLLLLLLBLLLLLBkWWWWbTbbNNbtTtBBtBBkWgWWwgwwkWkwwNBBBBBBk.",
  "...............NBNWwwwNLLLLLLLBLLLLLBBkWWWbTTNNLEttTtBBBBBkWWgwwgwwkWWNwNBBBBBBBk",
  "...............NBNNwwwgLLLLLLLBLLLLBBkWWWWbtNLLNEttttTBBBBkWWWwwwwkWWWNNBBBBttBBk",
  "...............NBNkgwwwNLLLLLLLLLLBBEkWWWWNNLLgkTtTTtTBBBBkwWwwwwwkWWNNLNNBTTtBBk",
  "...............EBNkNNNNNLLLLLkkkLLBNBkWWENLLggwkTttTtTBBBkBkwwwwwgWkNCCCLLNTttBtk",
  "...............NBNNBBBLCNNLLNBBkLBBNBkWNLLggwwgkTtttttBBBNBkwwwwwNNLCCCCCLLNtBBTk",
  "...............NBNkBBLCCLLNkBBkBBBNBBkkNBgwwwwktTtttTBBBNTBBkwwwgNNNCLCCCLLLEBTk.",
  "..............BNBNkBBLCLLLkBBkBkkkBBkWkLgwwwwgtTtttTTBENttTBkkkkgLLLECCCLLLLEttk.",
  ".............BCNBNkBLCCLLkBBkBBBBBkENkLLgwwwwgTTTtTTkkBBTtTBkLkLLLLLLNCLLyyLBkk..",
  "......E......BCNBNkBLCLLkNBBkBBBkkLLBkBNwwwwwWkbbbbbtTTBBtTkBLLkLLLLLBNyyyyLBN...",
  ".....NBN....BCkBBNNkBLLkNNNkBBBBLLLLBkBNwwwwWWkgTtttttttBBBktTLkLLLLBBNyyyTBBk...",
  ".....NBBN...BCkBBNNkBBkNNNkBBBLLLLLBkBNwwwWWWWWgTtttttttTBBNTttBkyyTBBBNyTBBBk...",
  "......kBBN..LCkBBNNkBkNNNkBBLLLLLLBBkBNwwWWWWWWgtttttttttBEttttBkttttBBNBBBBtk...",
  "......kBBBkBCCkBBNNkkNNNkBLLBLLLLBBkkBNwWWWWwwktTttttttttBNBTTBBkttttBBkBBBTk....",
  ".......kBBBkkNNBBNNkNNNNkNBLBLLLLBBkBBNwwwwwwgktTttttttTBNBBBBBBktTTBBBkBBTtk....",
  "........kBBNNNNBBBBNNNNkBwNLLBLLBkBkBBwwwwwwwkktTtTttttTNBBBBBBkBBBBBBBkBTTk.....",
  ".NNEN....kNNNNBBBBBNNNkkwWNLLBLLBkkBkBwwwwwwwwgkktTTTTENtTBBBBBkBBBBBBkkTkk......",
  "NLLBBNNNkkkNNEBBBBNNNNkrWWwBBLLLBBBkkkwwwwwwwwkkTkkkbbtttttTBBkBBtttTBkkk........",
  ".NNNBBBkBBBkNkBBBBNNNkrROWwBLLLBBBBBBBkwwwwwwWWgktTTttttttttTkTtTTttTN...........",
  "..gwNNEkBBBBkNkBBNNENkOkOBBLLLLNBBBBBBkwkkkwWWWk.bbtTtttttttktttttttk............",
  "...gwwwwNkBBNwNNNNNkkLNNELLLLLLNBBBBkk.k...kgWWk...bbtttttbkktttTtkk.............",
  "....gwwwwNkBBwrkNNkCCLLLLLLLLLNBBBBk.........kkk.....bbbbb...bbbbk...............",
  ".....gwwwwwNBNNkkkLCNBLbbbLLLLNBBBBkNN...........................................",
  ".....gwwwwwNBBNCLBLLNbbtttbLLLNBBBkBBBk..........................................",
  "......kwwwNBBNbNBLLbbyyyTtTkLLLNBBkkkBBk.........................................",
  "......kWwNBBBbyybbbyyybbbbTTbbLNBBk..kBBN........................................",
  "......gWWNBBbTbbyyyTkkkwWkbttbkBNBBk..kBN........................................",
  "......gWWgNNNbgwbbbRRRRgWkkbtttkNBBk...NBN.......................................",
  ".......gg....EbwWkRRRRRRgkkkkkTTTNBBk..kBN.......................................",
  "..............kgWkRRRRRRRkkkkkkkTTNBk...NBN......................................",
  "...............kgbkRRRRRRkkkrrRkkTNk....kBk......................................",
  "................kkTtkRRRkkrOOOrRktk.....kBk......................................",
  ".................NkktkRRkOOOOOOrkTk.....NBk......................................",
  "................NBBNkTRkrOOOOOOrbtk....NBN.......................................",
  "................NBN..kTROOOOOOOrbTk....kBN.......................................",
  "................NBN..kTrOOOOOOObTtk....kCN.......................................",
  "................NBN...kRrOOOOOrbyb.....kCN.......................................",
  ".................NBN..kRrOOObbRbyk.....kCN.......................................",
  ".................NBN..ktRRrRWwbbyk.....NCCN......................................",
  ".................NBN..ggRRrrRwbbyk......NCN.....NN...............................",
  "................NBN..kgWWRRRbRyyTk......NCCN...NCk...............................",
  "............NN..NBN..kygRRRtyyytk........kCCNNNCCk...............................",
  "............NLNNLBN...kyyyyykkbk..........kCCCCkk................................",
  ".............NLLLN.....kkkkk...............kkkk..................................",
  "..............NNN................................................................",
];

// The tail fan (top-right), split from the body so it can sweep back and forth
// like a fish's while he swims. The cut was tuned visually against the chart: the
// fan's upper blades plus its lower lobe, hinged where the fan meets the last body
// segment. Stray cells at the seam only micro-wiggle, so the cut need not be exact.
const isTailCell = (x: number, y: number) => (x >= 56 && y <= 24) || (x >= 66 && y <= 33);

export const GYARADOS_BODY = GYARADOS_SPRITE.map((row, y) =>
  [...row].map((ch, x) => (isTailCell(x, y) ? "." : ch)).join(""),
);
export const GYARADOS_TAIL = GYARADOS_SPRITE.map((row, y) =>
  [...row].map((ch, x) => (isTailCell(x, y) ? ch : ".")).join(""),
);

// The hinge point (cell ~62, 28 of 77 rows x 81 cols), as a CSS transform-origin
// for the sweep rotation on the tail overlay.
export const GYARADOS_TAIL_ORIGIN = "76% 36%";
