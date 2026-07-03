// The legendary serpents that raid the play area: Gyarados and Rayquaza. Both
// are pixel copies of reference art (downsampled + octree-quantized), NOT hand-
// drawn. Gyarados is a straight trace of a side illustration (gyrados side.png).
// Rayquaza's only reference (ray_side.webp) is a model kit curled into an S, so
// it was UNROLLED into a straight serpent first: its body centerline was traced
// (skeleton longest path) and perpendicular cross-sections were laid along a
// straight axis (see scratchpad unroll.py). Each sprite natively faces right and
// mirrors with scaleX for leftward travel. To swim, it's sliced into thin
// vertical columns at render time and a traveling sine runs down them (see
// .serpent-slice), so the body SNAKES like a fish — head steady, amplitude
// growing toward the tail. The palettes are machine-derived from the photos, so
// their letters carry no fixed meaning; they are just the traced colors.

const GY_IMAGE_HEX: Record<string, string> = {
  k: "#50ADDB", B: "#616564", L: "#FCFCFC", N: "#2B5266",
  W: "#A09F9B", c: "#E3D2AE", d: "#307093", R: "#508EAA",
  p: "#9D8F73", G: "#3987B0", E: "#C9B794", D: "#67C6F4",
  Y: "#1B394A", O: "#1E2C33", m: "#557789", a: "#847966",
};

// Gyarados: an exact pixel trace of the reference side illustration
// (gyrados side.png), mirrored so it natively faces right, downsampled +
// octree-quantized, background flood-filled away.
const GY_IMAGE = [
  ".........................................................................................................................................................................W.......................................",
  "........................................................................................................................................................................WLW......................................",
  "........................................................................................................................................................................WLWW.....................................",
  "........................................................................................................................................................................BLLB.....................................",
  "........................................................................................................................................................................WWLB....................BW...............",
  "........................................................................................................................................................................WBLWW...................BNR..............",
  ".........................................................................................................................................................................BLLB....W..............WNBW.............",
  "..........................................................................................................................................................W..............BLLB...WRB..............BdN.............",
  ".........................................................................................................................................................WWW.............BWLWW..BLB...............ORN............",
  "........................................................................................................................................................WWLB.........mW..BWLLB.WWWW...............aNNB...........",
  ".........................................................................................................................................................BLB.........BWB.WWLLW.BLLW................ORNW..........",
  ".........................................................................................................................................................BWLB........WBWWBLLLLBWLLB................WORO..........",
  "..........................................................................................................................................................BLB.........BWLBLLLLLLLLB.................BNNB.........",
  "..........................................................................................................................................................BLLB.........BLWLLLLLLLLB........BNBBW.....BRNW........",
  "..................................................................WB......................................................................................WWLBB...B....BLWLBBBBWWLR.......ENYNmNBOBBmBNRNW.......",
  "..................................................................WB.......................................................................................BLLRBWWmW...WBNdGRRRRRmNB.....WNGdYYRRNNmkGYNRNW......",
  "..............................................................BB..WBW.....................................................................................BWLLLLLLB...WNGkDDLLLLLLDkmmE..YkkkkNONRRNNddNRRmB.....",
  "...............................................................BB.WWB...................................................................................WBLLLLLLLLB..ENkDkkkDLLLLDDLDkGRNdNddNNNNONRRNNNRdRRB....",
  "...............................................................BWBBLm....................................................................................BmLLLLLLLW..NkkkkkkDDLDDDDDkkDNNNYGGRkkkdYONRRRRRdRB....",
  ".................................................WB............WBLWLWW....................................................................................BWWWWWLWB.WdkkkkkkkkkkkDDkkkkNNNNkkkkkkkRdYONRRRdRN....",
  "..................................................BB............BLLLLB.OB.................................................................................WNmmRRRdddYkkkkkkkkkkkkkRkkkkNdNOYNdGkkkkkGNBNNRRRBBB..",
  "...............................................B..BWW.........W.BWLLLB.BBW.......................................................................WWRWRRRWmNkDDDDkRkNdkkkkkkkkkkkkkNNdkDddGdNNYNNNdkRRdWLBOBRONdW.",
  ".............................................W.BBBLLB.........BBBLLLLW.mLB....................................................................WBmRkkkkLGGNRDkDkkRGdNkkkkkkkkkkkkkkkYYNdNdkkRddNOOGkkRNWLBLBNONGW.",
  ".......WBBOOOOOYNNdmBBWc....................WO.BLLLLB.........WWLLLLLLBLLB..................................................................WNdkDDDDDkkRRNkkkkkkRdNRkkkkkkkkkkkkkkkmBBYNNNdRGdYdkkkkdOOBOONNdkmBp",
  "...........OBWBBNNNNdRRmBRW..................YBBLLLLW..........BLLLLLLLLLR..........................................................WWRRmmdGNNDkkkkkDkGdNYkkkkkGddRkkRkkkkkkkkkkkkkRBLmNNNNNNNNNNNdkkNYNdGkkkBEc.",
  ".........WBWLLLLLWWmBBNRkkRmW...WBmRRW.WBRWW.BBmBBWWW..........BWLLLLLLLLW........................................................BNdRkkDkkkddDkkkkkdNBBBNkkkkkddkkkRRRRRRkkkkkkkkkkNLLLWBNNNNNYYNYdkkkkkkkDGaLB.",
  ".........WBWLLLLLLLLLLWBNRRRdNBNNRkkdNONGRkddNOdkkGNNBBBBBmWW...BWWLLLLLLW.......................................................BdkkkkDkdNdYGDkkkkkOccWpNkkkkGNdkkkGGRRRGRRkkkkkkkkBLLLLLWmBBNNNNdNkkkkkkkDNEcB.",
  "..........WBLLLLLWWmBmRRRLLDDmOGRkDRLpYkkkROBORkkkOBNONdkkkkGdRBBNNBmRWLLW................................................WWRRmmBNkkkkkGYBBBOGkkkkkDNBWWpNkkkkGNdkRRdddGGddGRRRRRRkdRLLLLLLLLLWNdNdYkkRkkkkGBcBB.",
  "..........WLLWBBBRRkLLLLLDkkkNNddLkkRNdGGkkNBNRkDkdNOdRkkDmBBmYNkkDkkkRmRWWWWWWW.......................................WBmkkDkddYNkkkkkNccWWNkkkkkkkkNOBBYkkkkRdNkRGdddddddddGGGGRdmLWWWWWWWLLLWYYYdkkdNkkkNWWWW.",
  ".........EBBNRkDLDDkkkRRkdkkkNNNNNNNGNBBBNNGNNddGLkGYGkkDDNpWBNkkkkkDmNNNOddRRRRmmW.........................WBBmmmmRmRBNkLLLRNBBOdkkkkkNpWWWYkkkkkkkkkdNNYkkkkGdYNkRGdddddddddddGRdWLWWWmBBBBBWWNkkkkkkNdkGBa....",
  ".......RBNGLkkRdddddddddNkDkkYpccccEWBcLccWaNaWpaBNNNGGLLkkdBYGkkkkkkOWWOGkkDDDDkkddBNNNmmmRWW...WWWWWW...BNdkDDDDkGdGYRkkLRBWWWBdkkkkkkNNNBYkkkkkDDkkGGdYkkkdNBBBNNddddddGGGdddGGGBLLLLLLLLLLWWmkkkkkRdYkdLW....",
  ".....WONdNNNNNNNNNNNBBONkDkdmBBpWWWWcBBcccccapLcLcEBBLBBBBNGNNLkDDDDDGBBNkkkkkkNBNNYYGkDDDkRdNNONdRRkkRmRBYkkkkkkRBBBBNkkkDdBWBWBNkkkkkkkGddYkkDkLddddddGNkkNacccLcpBBBBLOONddddGRkdNBBLLLLLLLLLmdkkkRRRNGBB.....",
  "......WWpBWWWWLLLLLLWBRDkdNW...WWWWWWWWBBapppOWccccWBcLLLcEpYNBNNNdGkkkYdkkkkkkOBWWOdRkkDkNBBBONkkkDkmBBNOdkkkkkkOpccBGDkkkkdNNNONkkkkDDkGGRNkkdNBppppppLOmNWLccccccccEEppLYYYNddRRkkkdBLLLLLWBmmNNdkkRRNNLW.....",
  "........WWLLLLLLLLLmNkkdNW.................W.WBBppEpLcccccccBpcccEpaBNGNdLkkkkDkdNNYdGkkDROWWpYRkkkDYBWWpOGkkkkkkkNBBOkkkkkkkkGdNYkkkLdNNNNdYdBWcLLLLLLccEOELcccccccEWWppppNNNYYdGRGGRkNLLLLNdGGdNNONkkkdBB......",
  ".......WBLLLLLLLWBNddNBW........................WWWWBBWEEWWEBpLcLLLLcEWYBBBBBNNdLkNNRkkkkDkNNONRkkkkkdNBBYGkkkkkkkkGdYkkkkDDDkkRRYGGBBpEcccEBaLLccccccccccBWcccccccccWWppppLNNNNYdddddGNLLLONkkdYNYNONkdBBW......",
  ".......OLLLLLWBNddNBW................................WBBBpppBpcccccccccBWLccccEpBdNNGGLkkkkkGNNkkkDDDDkGYNGkkkDDDDkkkNRDkkdNNNNNRNNWcLLLLcccpBccccccccccccWLcccccccccEWpppWaYNNNNNdddddOLLB.WNGNNNNddYdNEB.......",
  ".....WBWLWRBNdddNBW.....................................WWWWaLEcccccEEcpaLccccLLcEBBLBBBBBNNdNNkGGddddGkNNkkkLGGGGGkkNLGNBaWEEEppBLLcccccccEELccccccccccEEcaLcLcccccccEEWWpaONNNNNYYNNBBBBW...WBdNdddNNNEBaB.....",
  "...WNBmBOOYNNBBW.............................................WBBppEEEEEELcLcccccEcapLLLccccWBYNmBappppBNYNdNBBppppBBmYBWccLLLLccccBWLcccccEEcBpccccccccEEEWEBLcLLLLLccEpaaW.WONYOBW............WdNBNdNNdBpaB.....",
  "WBNYNNBBWW......................................................WBBBapapaBpEccEEEEpBcccccccccBLLLLLLLcccBBEccLLLLLccEBWLLccccccEEEpBLcccccEWWpLcccccccEEcEpppBBBppppapWW.....WBW................NmLWBNNkYpBLW....",
  "..........................................................................WBBappppELpLccccEEcapLcccccEEcBWLccccccccEcpaLcccccccEEWWLWcccEEWppELpcccccccEppBWW...................................BdW..BOkdBBLB....",
  ".............................................................................WWWWppWBpEccEEEEWLccccccEEcpBccccccccEWWpLcccccccEEEEppLEccccEpppa.BBaaapBaW.......................................WNW...BdkNBBa....",
  ".....................................................................................WBBBBBBapBBBBaaaapppBBppWEEEpppppBBEEccccEEppapBBaaaaaBaW..................................................cNB....BmNpBOB...",
  "...........................................................................................................WWBBBBaaapW.WBBBBBBBBpWW..............................................................NN.......pEBB...",
  ".................................................................................................................................................................................................BN........ppB...",
  ".................................................................................................................................................................................................BN........WBW...",
  ".................................................................................................................................................................................................BdW.............",
  ".................................................................................................................................................................................................Bdc.............",
  ".................................................................................................................................................................................................mmE.............",
  ".............................................................................................................................................................................................R...BB..............",
  "............................................................................................................................................................................................WN..WmB..............",
  ".............................................................................................................................................................................................dRmdNE..............",
  ".............................................................................................................................................................................................WNBBW...............",
];

const RAY_IMAGE_HEX: Record<string, string> = {
  k: "#1FA95E", B: "#55B26E", L: "#EE6755", N: "#000000",
  W: "#70C48C", c: "#EBD110", d: "#68B88A", R: "#92CFA4",
  p: "#989D5C", G: "#9EB429", E: "#EC5736", D: "#62D37B",
  Y: "#1C6431", O: "#EB9B98", m: "#2D7361", a: "#F2F5F2",
};

// Rayquaza: the model kit (ray_side.webp) with its curled body UNROLLED into a
// straight serpent (skeleton centerline + perpendicular resampling, scratchpad
// unroll.py), then the clean head from the same photo GRAFTED back onto the neck
// (the unrolled head came out mangled). Downsampled + octree-quantized; faces right.
const RAY_IMAGE = [
  "...........................................................................................................................................................................................................................................................................................RWBWR...............................................................",
  "...........................................................................................................................................................................................................................................................................................WBBBBWR.............................................................",
  "...........................................................................................................................................................................................................................................................................................BkkkkkWR............................................................",
  "............................................................................................................................................................................................................................................................................................kkkkkkWR...........................................................",
  "............................................................................................................................................................................................................................................................................................BkkkkkkWR..........................................................",
  "................................................................................................NLLLLLLO....................................................................................................................................................................................dkkkkkkkWR.........................................................",
  "..............................................................................................LLLBBENNNELO....................................................................NNOO.......................................................LLLLLLLLLLLLLLELL...................................kkkkkkkkWR........................................................",
  ".............................................................................................LpEBkkkkkkBNLL...........................................................LLLLLLLLLELLL.....................................................LLELLLLLLLLLEEENNEL..................................BkkkkkkkkWR.......................................................",
  ".......................................................................................OLLLO.NkkkkkkkkkkkBL........................................................LLLLkBNNNBBBkBkN....................................................LLBkkBBNNNNBNBBkkkBEN..................................kkkkkkkkkWR......................................................",
  ".......................................................................................ONBELLNkkkkkkkkkkkkBL.......................................................LELNkkkkkkkkkkkp....................................................LkkkkkkkkkkkkkkkkkkkL..................................BkkkkkkkkkWR.....................................................",
  ".......................................................................................LNkLEEBkkkkkkkkkkkkBL.......................................................LNEBkkkkkkkkkkkN...................................................LpkkkkkkkkkkkkkkkkkkkN..................................WkkkkkkkkkkWR....................................................",
  "......................................................................................OLBkNLLkkkkkkkkkkkkkBL......................................................LNkBkkkkkkkkkkkkN...................................................LNkkkkkkkkkkkkkkkkkkkN...................................NkkkkkkkkkkWR...................................................",
  "......................................................................................LEkkkBBkkkkkkkkkkkkkkL......................................................LBkkkkkkkkkkkkkkpL..................................................LNkkkkkkkkkkkkkkkkkkkN...................................BkkkkkkkkkkkWR..................................................",
  "......................................................................................LEkkkkkkkkkkkkkkkkkkkL................................................LELa.LEkkkkkkkkkkkkkkkBL..................................................LNkkkkkkkkkkkkkkkkkkkN...................................WkkkkkkkkkkkkWR.................................................",
  "..................................................................................RdRRppBBBBBkkkkkkkkkkkkkkL...............................................RpppRRpNkkkkkkkkkkkkkkkkL..................................................LNkkkkkkkkkkkkkkkkkkkNO...................................BkkkkkkkkkkkkWR................................................",
  "..................................................................................RWWWWWdWWWWBkkBBBBBBBBkkkL..............................................dWDDDBBDDBBBBkkkkkkkkkkkkNON...............................................NENkkkkkkkkkkkkkkkkkkkNN...................................dkkkkkkkkkkkkBWR...............................................",
  ".................................................................................RRRRRRWWWWWWdBBBBBBBBBBBBkppBd...........................................BWBBBBBBBBBBBBBBBBBBBBBBkBBBBWW...........................................BBNNkkkkkkkkkkkkkkkkkkkNNkd..................................kkkkkkkkkkkkkBWR..............................................",
  "...............................................................................RdRRRRRRRRRRWWWWBBBBdWdBBBBBBBBW..WBWdBdBBBBBBBBkBdWdBBBBWWWWdWWWdRRRRdW...ddBBBBBBBBBBBBBBBBBBBBBBBBBBBkWa...............WWWdWWWddddddW............dkkkkkkkkkkkkkkkkkkkkkkkkkkkR....Bddd....WWdddddBdBBddddR....RBkkkkkkkkkkkkkBWR.............................................",
  "...............................................................NRRRRRRRRRRRRRRRWmdRWWWWWWWWWWWWddBBdddBBBBBBBBkdWkBkBBBBBBBBBBBBBkkBBBBBBBBBBBBBWBWWWWWWWBBWdWdddBBBBBBBBBBBBBBBBBBBBBBBkadBWWWWWWWWDWWDWWWDDDDDWDDWDDBBDBBBDkkBkdakkkkkkkkkkkkkkkkkkkkkkkkkkkkNNkkkkkkBBBBDDDWWWWWWWWDBDDDDDDWWDBkkkkkkkkkkkkkkBR.............................................",
  "..................................RddN..........RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRWmdWWWWWWWddWWWWddBBBBBBBBBBBBBYNkBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBdddddDNmWWWWWWWWWddBBBBBBBBBBBBBBBBBBkmmkBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBkkkkkkmBkkkkkkkkkkkkkkkkkkkkkkkkkkkkNmkkkBBBkkBBBdddWWddddBBBBBBBBBBBkBkkkkkkkkkkkkkkkBW............................................",
  ".............................RRRRWRdmkdWdWRWWRWWWWWWWWWWWWWWWWRRRWWdNNRRRRRRRRRBNNWdWdddddddddWdBBBBBBBBBBBBBBYNkBBBBBBBBBBBBBBBBBBBBBBBBBBBBdddddddddddWkmBRRRRWWWWWWWddBBBBBBddBBBBBBBBYYkBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBkkkNYkkkkkkkkkkkkkkkBkkkkkkkkkkBkNYkkBBBBBNNNNNNNdWWWWWWdWdDNNNNccNNDkkkkkkkkkkkkkkkBR...........................................",
  "....................RRRRWWWWWWWWBBWkNkWWWWdBNNNNNNpBddddWWWWWWWWdNNNNNNNNNpWRRRBNdWdBBBBBBBBBBBBBBBBBBBBBBBBBDYNkBBBBBGNccccccGBBBBBBBBBBBBdBBDNppBdWWWdWkNBRWWWWWWWWWWWWWddddddddddddBdBYYkdBdBBNNNNNNNNddWWWWddddNNNcccNNBBBBBkNYkkkkkkkkkkkBBBBBBBBBBkkkkkBkNYBBBBNcccccccNNNNWWWWWWdNNNNNNNNNcN..WkkkkkkkkkkkkkBW..........................................",
  ".............dRRddWWWWWWBBBBBBBBBBWYYBBBdBNccccccccNNBddWWWWdWWpNNNNNNNNNNNNWWRkNdBBBBBBkkkkBBBBBBBBBBBBBBBBBDYNmDBBGcccccccccccNBBBBBBBBdBNNNNNNNNNNNWWWBNBWBBBBdBdddWWWWWWddddddddddddkmmBddBNNNNNNNNNNNNWWWWWWNNNccccccccNBBBkNYBkkkkkkBBBBBBBBBBBBBBBkkkkBkNmDBpccccppBBppcccpddBWBNNNppBBBBBpN...WkkkkkkkkkkkkkBR.........................................",
  ".....RWpLNNNWWDBWBBBBBBBBBBBBBBBBBDYYkBdBcccppppppNcccBWBddWBBpcccpBBBBBpGccpBWkmBBLLLLLNppBBkBBkkBBkkkBBBBBBDmNYDkGccGBBBBBBBGcccBBBBBBBpccccNNNNNNNNNdWBNmkBLLNpBBBkBdddBBBBBBBBBBBkkBkmmBdBNNcNppBppNcNNpdWBdNcccNpBBBGccccBBBNYBkkkkkBBkkkkkkkkkkkkkkBBBkBBNmBBcccBBBBBBBBBGccBBBBNccBBBBBBBkkB....BBkkkkkkkkkkkkDR........................................",
  ".dBWWBNLELLLLLNppppBBBBBpppppNNLBkkYNGNGccGBkkkkkkkBccGBBBBBkBccBkkkkkkkkkBccNkmNmBLELLLLLLLLpBBBpLLLNpBkkkkBDkNYkBccBkkkkkkkkkBcccBkBBBGcccNBBBBBBBNccpBkYYkkELLLLLppBkkkkkkkkkkBBBppNkkNmBBcccBBBBBBddBcccBBBBccGBBBBBBBBBccNkBNYDkkkkkkkkkkkkkkkkBBBkkkkkkBBNYkGcGBkBBBBBBBkkGcNBBBccBkkkkkkkkkk........dkkkkkkkkkkDR.......................................",
  "dkkkkkBLLLLLLLLLLLLLLLLLLLLLLLLLNkkkNccccckkkkkkkkkkNccccccccccGkkkkkkkkkkkNcNGNNYBLLLLLLLLLLLLLLLLLLLLLLpppBkBNNNccGkkkkkkkkkkkBccNGGBGccBBkkkkkkkkkBccBBNNkkEELLLLLLLpppBpppLLLLLLLLENkNYkGcGBkBBBBBBBBBccBkkGcNBkBBBBBBBkBccBkNYBBBkkkkpLLLLLLLLLLLLLpBpppBBNmBccBkkkkkkkkkkkBccccccckkkkkkkkkkk.........RkkkkkkkkkkWR......................................",
  "dkkkkkpLLLLLLLLLLLLLLLLLLLLLLLLLNkkkNkkNNcNkkkkkkkkkGccGNGNNcccGkkkkkkkkkkkNcccNNNkLLLLLLLLLLLLLLLLLLLLLLLLLNkBNNGccGkkkkkkkkkkkkGcccccccBkkkkkkkkkkkkGcccNNkkEELLLLLLLLLLLLLLLLEEEEEEENkNNNccBkkkkkkkkkkkGccNNccBkkkkkkkkkkkGcGkNmBLLNpLLLLLLLLLLLLLLLLLLLLLBkNNccckkkkkkkkkkkkNcccccccNkkkkkkkkkk...........kkkkkkkkkkWR.....................................",
  "..ddBBBBpLLLLLLLLLLLLLLLLLLLLLLLNkkkNkkkBccGNkkkkkNGcckkkkkkkkNcNkkkkkkkkkNNcNkNNNmNLLLLLLLLLLLLLLLLLLLLLLLLLYNYNYkGcNkkkkkkkkkkkGccBNNccBkkkkkkkkkkkkGcccNNYBpLLLLLLLLLLLLLLLLLLLLLLLENkNGcccBkkkkkkkkkkkcccccccGkkkkkkkkkkkBcccNmkELLLLLLLLLLLLLLLLLLLLLLLLkBNNcccBkkkkkkkkkkGccBkkkBccGkkkkkkkkk...........WkkkkkkkkkkWR....................................",
  "......WWBDBBpppLLLLLLLLLLLLNNpppBkkkYkkkkNGccNNGGNcccBkkkkkkkkkNcGNkkkkkkNNcGkkkNNYkkkBNNNNLLLLLLLLLLLLLLLLLLNkmNYkkNcGkkkkkkkkkNccBkkkNcGkkkkkkkkkkkNccBkkNNBkkpLLLLLLLLLLLLLLLLLLEELENkNYBGcpkkkkkkkkkBGccBBBBccGkkkkkkkkkkGcNGNmkELLLLLLLLLLLLLLLLLLLLLLLLkkNYkBccGBkkkkkBGcccBkkkBkBcccNBBBkBBG............WkkkkkkkkkkWd...................................",
  "...........WkBBBBBBBBBBBBkkkkkkkkkkkYYkkkkkBGNccccGNkkkkkkkkkkkkGcccNGGGNccGkkkkYNNkkkkkkkkkNLLLLENkBNLLLLLLLNkkNNkkkNcNGNNBNNGNccGkkkkNccGBkkkkkkkBGccGkkkYNBkkkkBBpLLLLLLLLLLLLLLLLLpkkYkNBccNBBBBBBBGcccBkkkkBcccGBkkkkkNGcGkkNmkNLLLLLLLLLLLLLLLLLLLLLLLLkkNYkkBccccNNNccccGBkBBBBBBBGccccccccc............NBkkkkkkkkkBWNNDddd.............................",
  "................WBBBBkkBkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkGGNcNNGGNkkkkkYNNmkkkkkkkkkkkkkkkkkkkBBNBBBkkkNNkkkkNNccccccccGBkkkkkkNcccGGBNNGGcccGkkkkYNmBkkkkkkBppNpNpppBBBBBBBkkkkmkBBBNccccccccccGBkkkkkkBGccccccccccGkkkNmkBLLLLLLNBkkkkkkkkkkBLpppkkBNYkkkkGcccccccGBkBBBBBBBBBBBpGccccNp.......NRBDDBkkkkkkkkkkkBNcccNNNNR..........................",
  "........................RdddBBBBkkkkkRddBBBkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYNYkkkkkkkkkkkkkkkkkkkkkkkkkkkkYNYkkkkkNNNGGNBkkkkkkkkkkkGNccccccccBBkkkkkkNYBkBBBBkkkkkkkkkkkkkkkkBBBBkYkBBBBBpNcccNGBBkkkkkkkkkkkBGNcccGGBkkkkNmkkBNppBkkkkkkkkkkkkkkkkkkkkkYYkkkkkkBBBBBBkkBBBBBBBBBBBBBBBBBBBB....NNDBkkkkkkkkkkkkkkkkkBBkBBNNNNDdBBW.....................",
  "...................................................dddkkBBkkBkkkkkkkkkkkkkkkkkkkkkNmkkkkkkkkkkkkkkkkkkkkkkkkkkkkkNYkkkkkkkkkkkkkkkkkkkkkkkkkBBBBBBBkkkkkkkkkmNkkkkBBBBBBBBBBBBBBBBBBBBBBkYkBBBBBBBBBBBkkBBkkkkkkkkkkkkkkkkkkkkkkkYYkkkkkkkkkkkkkkkkkkkkkkkkkkkkYNkkkkkkkkkkkkkBkkBBBBBBBBBBBBBBBBBB..NcBkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkWR...................",
  "....................................................................ddBBBdBkkkkkkkkdkkkkkkkkkkkkkkkkkkkkkkkkkkkkkYdNkkkkkBBkkkBBkkkkkkkkkkBkkBBBkkBBBBBBBBBBd.BkkkkkkBBBBBBBBBBBBBBBBBBBdBDWWWWWDDWWWWDWDdWWBBBBBkBkBBkkkkkkkkkkkYBkkkkkkkkkkkkkkkkkkkkkkkkkkkkmBkkkkkkkkkkkBBBBBDDWBDDDDDDDDDBBBBdWpcBkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkBkkBBBDR..................",
  "....................................................................................BkkkkkkkkkkkkkkkkkkkkkkkkkkkkBN..................................ddddBd...BkkkkkkkkkkkkkkkkkkkkkkkBBW.dBBddWRR.............RRRW....dddBBBBBkkBakkkkkkkkkkkkkkkkkkkkkkkkkkkkdaBkBddddBdd.........WRRWWdWdBBdBBddBcckBkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkBBBR.................",
  "......................................................................................NNkkkkkkkkkkkkkkkkkkkkkkkkkkd...........................................pYkkkkkkkkkkkkkkkkkkkkkkBWR..........................................kkkkkkkkkkkkkkkkkkkkkkkkkkkkd................................WBkBcpBBBkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkBBBBR................",
  "......................................................................................NNkkkkkkkkkkkkkkkkkkkkkkkYNd.............................................NNNNNkkkkkkkkkkkkkkkkkkNN...........................................BkkkkkkkkkkkkkkkkkkkkBkkBBkBd...............................WDBBNcBBBBBBBkkBBkkkkkkkkkkkkkkkkkkkkkkkkkkkBBBdR...............",
  "......................................................................................ENkkkkkkkkkkkkkkkYYYNNkkkNLN.............................................NNNNNNNkkkkkNNNNNNNNNNNN..............................................NNBNNNkkkkkkkkkkkkNENNNN................................RWBBdBNcBBBBBkkkkBBBBBBBBBBkkkkkkkkkkkkkkYmkkkkBBBWR..............",
  "......................................................................................LEkkkkkkkkkkkkkkNNNNNkkkkNLO.............................................NkNNNNNNNNNNNNNNNNNNNNNN...............................................LNNLNBkkkkkkkkkkkNL...................................WWBddBBccBBBkkkkkkkkBBBBBBkkkkkkkkkkkkkkkkkNNmkkkBBdWR.............",
  "......................................................................................LLkkkkkkkkkkkkkkENENNkkkkNEL.............................................NkkNNNNNNNNNNNNNNNNNNNNN...............................................NNaaLNkkkkkkkkkkkLL..................................WBBdddBBccBkkkkkkkkkkkkBBkkkkkkkkkkkkkkkkkkkBNNYkkkBBWRR............",
  "......................................................................................LLkkkkkkkkkkkkkkEELEEkkkkNEL.............................................BkkkkkNNNNNNNNNNNNkNNkNN....................................................NkkkkkkkkkkkN..................................WBBWWdBBBccBkkkkkkkkkkBBkkkkkkkkkkkkkkkkkkkkkkBYNNmkkBBdWR...........",
  ".......................................................................................LBkkkkkkkkkkkkNELNLEBkkkkEL.............................................BkkkkkNNNNNNNNkkkkkkkkNN....................................................Lkkkkkkkkkkk..................................WBdWWdBBBBcNkkkkkkkkkkkBBkkkkkkkkkkkkkkkkkkkkkkBkNNNmkkBBWRR..........",
  ".......................................................................................LENkkkkkkkkkkkNOOOLENkkkkLL.............................................NNkkkkkkkkkkkkkkkkkkkkNL....................................................LBkkkkkkkkkB.................................WDdWWdBBBkpcGkkkkkkkkkkkBBkkkkkkNNBBkkkkkkkkkkkkkBNNNNmkkBBdR..........",
  ".......................................................................................LLLENkkkkkkNENLO..OENkkkkLE.............................................LENNNNkkkkkkkkkkkNNNkNNL.....................................................BkkkkkkkkkB................................WddWWWBBBBkpcGkkkkkkkkkkkBBBkkkkkNLLLNpBkkkkkkkkkkBmNNNmNmkBBWR.........",
  "..........................................................................................LENkNENLLLNL...OLENkkNEE..............................................LLLLEYkkNNNNNNNNENENENL.....................................................LNNNNNNNNLL...............................WWdWWWdBBBBkNcGkkkkkkkkkkkkBBBBkkkBNELLLLLNBkkkkkkkkBNNNNGNmkBBWR........",
  "...........................................................................................LENLLLL........LLEEEELN..................................................LENEEEEEELLLLLLLLNO.....................................................LLLLLLLLLLL...............................WdWWWdBBBkBNccBkkkkkkkkkkkBBBBBBBkNNNNNNLLLLLNBkkkkkBBNNGcGNmkBBRR.......",
  "............................................................................................................NLL......................................................LNEL............................................................................................................WBWWWWBBBkkcccBkkkkkkkkkkkBBBBBBBBDkNLLNN..OLLLLLNBBkkDBmNGNNmmkBdWR......",
  "....................................................................................................................................................................................................................................................................................WBWWWdBBBkkcccBkkkkkkkkkkkBBBBBBBBBBkkLLLNN.....LLLLLNBBkDBBBBdBmBBdWR.....",
  "...................................................................................................................................................................................................................................................................................WWWWWddBBkBccckkkkkkkkkkkkBBBBBBBBBWkkkNLNLNL.......NLLLLNBBDDWdWBBBBdRR....",
  "...................................................................................................................................................................................................................................................................................WdWWWdBBBkNcNkkkkkkkkkkkkBBBBBBBBBWBkkkkNLOLLL.......LLLLLLLpBBBDWdBBBdW....",
  "..................................................................................................................................................................................................................................................................................WWWWWWBBBkNcNkkkkkkkkkkkkBBBBBBBBBWBkBkkkkNLNLL........LLLOLLLLLpBBDDBBdWW...",
  ".................................................................................................................................................................................................................................................................................RWdWWWBBBkNccBkkkkkkkkkkNWBBBBBBBBWBk..dkkkkLONLN.......OO..LLLLLLLLpBBBdWWR..",
  ".................................................................................................................................................................................................................................................................................WdWWWdBBkNccBkkkkkkkkkd.RBBBBBBBWWkk....BkkkBLONLL...........LLO..OLLLOBDdWWR.",
  "................................................................................................................................................................................................................................................................................WWWWWWBBBBccBkkkkkkkkk..RDBBBBBBWBkB......kkkkNLONOOO..................NadWWWWR",
  "................................................................................................................................................................................................................................................................................WdWWWBBBBccGkkkkkkkkk..RWBBBBBBWBkB........kkkkNLOOOL...................aadWdWW",
  "...............................................................................................................................................................................................................................................................................WddWWdBBBccGkkkkkkkkd...WBBBBBBWBkd.........dkkkkLLOLO...................aaaRWBR",
  "..............................................................................................................................................................................................................................................................................RWWWWWBBkNcNkkkkkkkkB...RDBBBBWWkk............BkkkBLOLLNO.................aaa.WWR",
  "..............................................................................................................................................................................................................................................................................WWWWWdBBpccBkkkkkkkk....dNkkBWBkk..............kkkkNLOOOO.................aa...R.",
  ".............................................................................................................................................................................................................................................................................WWdWWdBBBccNkkkkkkkkd......WkWWBd................kkkkLOOOO........................",
  ".............................................................................................................................................................................................................................................................................BWWWWdBBccGkkkkkkkkd.............................BkkkBLOOO........................",
  ".............................................................................................................................................................................................................................................................................WWWWWBkGcckkkkkkkkd...............................kkkkNLOOO.......................",
  ".............................................................................................................................................................................................................................................................................dWWWdBBccBkkkkkkkk................................dkkkkLNOO.......................",
  ".............................................................................................................................................................................................................................................................................WWWWBBNcGkkkkkkkkd.................................kkkkkLNOO......................",
  ".............................................................................................................................................................................................................................................................................WWWdBBccBkkkkkkkB..................................dkkkkNLOO......................",
];



export type SerpentSprite = {
  name: string;
  palette: Record<string, string>;
  // "cross": swims straight across at a fixed height, alternating direction.
  // "prowl": slithers in from a side edge, dives, then wanders the open water.
  behavior: "cross" | "prowl";
  // An exact traced sprite (tail-to-head, natively facing right). At render time
  // it's sliced into thin vertical columns and a traveling sine runs down them,
  // so the whole body SNAKES like a swimming fish (head steady, tail sweeping).
  image: string[];
  // On-screen size: each design pixel renders at renderScale * PX screen px. The
  // unrolled Rayquaza is very long, so it renders smaller than Gyarados to fit.
  renderScale: number;
  // Peak wave amplitude at the tail, in DESIGN px (the head barely moves). Tune
  // per serpent to its girth so the snake reads without tearing the silhouette.
  waveAmp: number;
};

export const SERPENTS: SerpentSprite[] = [
  {
    name: "gyarados",
    palette: GY_IMAGE_HEX,
    behavior: "cross",
    image: GY_IMAGE,
    renderScale: 1.2,
    waveAmp: 6,
  },
  {
    name: "rayquaza",
    palette: RAY_IMAGE_HEX,
    behavior: "prowl",
    image: RAY_IMAGE,
    renderScale: 0.8,
    waveAmp: 8,
  },
];
