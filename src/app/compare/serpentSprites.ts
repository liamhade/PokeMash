// The legendary serpents that raid the play area: Gyarados and Rayquaza. Both
// are pixel copies of reference art (downsampled + octree-quantized), NOT hand-
// drawn. Gyarados is a straight trace of a side illustration (gyrados side.png).
// Rayquaza's only reference (ray_side.webp) is a model kit curled into an S, so
// it was UNROLLED into a straight serpent first (its body centerline traced as
// the skeleton's longest path, perpendicular cross-sections laid along a
// straight axis), then the clean head and an arm from the same photo were
// grafted on (scratchpad unroll.py / graft2.py). Each sprite natively faces
// right and mirrors with scaleX for leftward travel. To swim, it's sliced into
// thin vertical column-bands at render time (SnakeSprite) and each band runs an
// SMIL <animateTransform> phase-shifted down the body, so it SNAKES like a fish
// — head steady, amplitude growing toward the tail. The palettes are machine-
// derived from the photos, so their letters carry no fixed meaning.

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
  k: "#20AA60", B: "#55B26D", L: "#000000", N: "#EE6755",
  W: "#6FC48C", c: "#EBD110", d: "#65B88A", R: "#93D0A4",
  p: "#989F5B", G: "#A1B425", E: "#146129", D: "#13883B",
  Y: "#61CF7B", O: "#F0F3F1", m: "#ED9996", a: "#F91514",
};

// Rayquaza: the model kit (ray_side.webp) with its curled body UNROLLED into a
// straight serpent (skeleton centerline + perpendicular resampling), then the
// clean head AND an arm cropped from the same photo grafted on with the body
// tube kept running under the neck for a solid join. Downsampled + octree-
// quantized (scratchpad unroll.py / graft2.py); faces right.
const RAY_IMAGE = [
  ".....................................................................................................................................................................................................................................RddWR...................................................",
  ".....................................................................................................................................................................................................................................BkBBWR..................................................",
  ".....................................................................................................................................................................................................................................BkkkkWR.................................................",
  "......................................................................................................................................................................................................................................kkkkkYR..................LLL...........................",
  "......................................................................................................................................................................................................................................BkkkkkWR................NNNN...........................",
  "......................................................................................................................................................................................................................................WkkkkkkWR...............NpLN...........................",
  ".......................................................................................................................................................................................................................................kkkkkkkYR.............NLkkBN..........................",
  "................................................................................NNLNN..................................................................................................................................................BkkkkkkkWR............Npkkkp..........................",
  ".............................................................................NNNBLNLLNN.........................................................LLL.............................................NNNNNNNNNNNNNN..........................kkkkkkkkYR...........LkkkkB..........................",
  ".........................................................................L...pLBkkkkkBLNN................................................NLNNNNNNNN............................................NNLNNNNNNNLLLBLN.........................kkkkkkkkkYR..........pkkkkk..........................",
  "........................................................................NNNLLBkkkkkkkkkBN.............................................NNNBkBBkkkkkk............................................LkkkkkkkkkkkkkkLm........................WkkkkkkkkkYR........Npkkkkk..........................",
  ".......................................................................mNkLNNkkkkkkkkkkBN.............................................NNLkkkkkkkkkkN..........................................LkkkkkkkkkkkkkkkBN.........................kkkkkkkkkkWR.......NBkkkkk..........................",
  ".......................................................................LNkLLLkkkkkkkkkkkN.............................................NBBkkkkkkkkkkN..........................................NkkkkkkkkkkkkkkkBN.........................BkkkkkkkkkkWR.....NNkkkkkk..........................",
  ".......................................................................NLkkBkkkkkkkkkkkkN............................................NLkkkkkkkkkkkkN.........................................NNkkkkkkkkkkkkkkkBN.........................WkkkkkkkkkkkWR...mNBkkkkkk..........................",
  "......................................................................mNBkkkkkkkkkkkkkkkN.......................................mLNLLLBkkkkkkkkkkkkL.........................................NNkkkkkkkkkkkkkkkkL..........................kkkkkkkkkkkkWR..NNkkkkkkk..........................",
  "...................................................................RWWRBBBBBBkkkBBBBBkkkL......................................WRBBWWBBkkkkkkkkkkkkLm........................................NLkkkkkkkkkkkkkkkkN..........................BkkkkkkkkkkkkWWmNLkkkkkkk..........................",
  "...................................................................WRWWWWWWWWBBBBBBBBBkkpLW....................................BWBBBBBBBBBBkkkkkBBkBBWBd....................................dNLkkkkkkkkkkkkkkkkLBd.........................kkkkkkkkkkkkkWLLkkkkkkkk..........................",
  "..................................................................dRRRRRRRRWWWBBBBWdBBBBBBWR.WdWddBBBBBBBBdWBBBBWWWdWWddRRRW...dBBBBBBBBBBBBBBBBBBBBBBBBR.............WWWWWWddddd..........dkkkkkkkkkkkkkkkkkkkkkkR....dd....WddddBBBBdddR.WWdkkkkkkkkkkkWBDkDDDDkD..........................",
  "...................................................RRRRRRRRRRRRRRWkRWWWWWWWWWWWdBBWdBBBBBBkBdkBBBBBBBBBBBBBBBYBYYBBYYWWWWWWWWWBBWdWddBBBBBBBBBBBBBBBBBBkdLkWWWWYYYYYYYWWYYYWYWYYYBBBBBkkkBRkkkkkkkkkkkkkkkkkkkkkkkLRkkkkBBBBWWWWWWWWWWYYYWBBBWdkkkkkkkkkkBWdkkkkkkk..........................",
  "...........................RRBBd....RRWWRRRRRRRRRRRRRRRWRWWRRRRRRdLRWWWWWWWdWWddBBBBBBBBBBkLLBBBBBBBkkBBBBBBBBBBBBBBBBBBBBdddWLLWRRRWWWWddBBBBBBBBBBBBBBkEkBBBBBBBBBBBBBBBBBBBBBBBBBkBkkkkLkkkkkkkkkkkkkkkkkkkkkkkLkkkBkkBBBBBddWddddBBBBBBBBBBBBkkkkkkkkkBRdBBBBBB..........................",
  "...................RRRRWWWWWWLEdWWWWWRLLLBdWWWWWWWWRWWLLLLLLRRRRRBBWWddBBBBBdddBBBBBBBBBBBkLLYBBBBBLLLLpBBBBBBBBBBBdddBBBddddWkLWRRRRRWWWWddddddddddddBWkLkBBBBYLLLLYBdddddBddBLLLLBBBBBkELkkkkkkkkkkkBBBkBBkkkkkkLLBBBBLccccLLLdWWWWWdLLLLccccLBddkkkkkkkkBWdBBBdB..........................",
  "............RWdWWWWWWWWWBBBBWELYBdYLLccccLLpddWWWWWWLLLLLLLLLLLWRBLdBBBBBkkBBBBBBBBBBBBBBBkLEYBBLccccccccLBBBBBBBdBLLLLLLLLWWWBLBWBBBWddWWWWWWdddddddddWkEBWdLLLLLLLLLLWWWWWWLLccccccLBBYELBkkkkkBBBBBBBBBBBBkkkBBLkBBLcccLppLLccpddWdLLLLppppLLcLBdkkkkkkkkBWkkkBB..........................",
  "....RWLLLLdWWWWYBBBBBBBBBBBBBEkBBBccLppppLccpdddddBpccppBBBppccBWkLBpNNNpppBBkkkkBBkkkBBBBBLEkBccLBBBBBpcccBBBBBBpcccLLLLLLLBWBLkBLNppBBBddddBBBBBBBBBBkkLBdLLcLpppLLLLLdWdBcccpBBpLccLBYELBkkkBBkkkkkkkkkkkkkkkBBLkBLccBBBBBBBpccBBBLcGBBBBBkkBLcBkLkkkkkkkkBWkkkk..........................",
  "WBBWBBNNNNNNLppppppppppLLNpkkELcLccBkkkkkkBccBBBBBBccBkkkkkkkBcLkLLkNNNNNNNNNpBBNNNNpBBkBBYLLBGcGkkkkkkkkBccBBBBLccpBBBBBBLccBkLLkLNNNNNpBBkkkBBBBBBpLLkEEkBccBBBBBBBBccBBBLcGBBBBBkBGcLBEELkkkkkkBBBBBBBBpBkkkkkBLkBcGkkBBBBBBkGcLBBcLkkkkkkkkkkLckLLkkkkkkkkYBLLk..........................",
  "dkkkkpNNNNNNNNNNNNNNNNNNNNLkkELLLcGkkkkkkkkGccccccccLkkkkkkkkkGcLGLLpNNNNNNNNNNNNNNNNNNNNBkELLccBkkkkkkkkkpccccccGkkkkkkkkkBccGLEkLLNNNNNNNLpNNNNNNNNNLDELkccBkkkkkkkkBcLBBcGkkBBkkBkkcckEEBNpkBpNNNNNNNNNNNNLLNpkLELcBkkkkkkkBkBcccccLkkkkkkkkkkGccpBBkkkkkkkkWLLLLWW.......................",
  ".dYBkBNNNNNNNNNNNNNNNNNNNNNkkLEkkGcGkkkkkkLcGBBBBBLcGkkkkkkkkkLLGLLEBNNNNNNNNNNNNNNNNNNNNLkkLELcGkkkkkkkkkBcccccckkkkkkkkkkkcccLLkpNNNNNNNNNNNNNNNLLNNLDELccGkkkkkkkkkBcccccGkkkkkkkkkBccLEBNNNNNNNNNNNNNNNNNNNNLkLGccBkkkkkkkkBccBBBGcGkkkkkkkBYLBBkkkkkkkkkkkkYLLLLLLLR.W..................",
  "....WWBBBpppNNNNNNNNNNNNLpBkkkEkkkGccGGGGccckkkkkkkLcLLkkkkkLGcLkkLLkBLLLLLNNNNNNNNNNNNNNNLkLEkGcGkkkkkkkkLcBkkGcBkkkkkkkkkGcGkkLBkBNNNNNNNNNNNNNNNNLNLkEELcckkkkkkkkBccBLBLcBkkkkkkkkGccLEkNNNNNNNNNNNNNNNNNNNNLkLEBccBkkkkkBGccBkkkkGccLBBkBLpBkkkkkkkkkkkkkkkkkkkBBBBYBBWR................",
  ".........WkBBBBBBBBBBBkkkkkkkkEkkkkkGGcccGLkkkkkkkkkBLcLLGGLcLLkkkELEkkkkkkkLNNNLkkLNNNNNNLkLLkkGcLGLLLLGccGkkkBccBkkkkkkBccGkkkLLkkkBBpNNNNNNNNNNNNNLBkLkLBccpBBBBBLccBkkkkcccGBkkkBGcLkEEkNNNNNNNNNNNNNNLNNNNNBkLEkkcccLLcccccBkBBBBBBcccLBcpkkkkkkkkkkkkkkkkkkkkkkkkkkkBkBR...............",
  "...............BddBBBBkkkkkkkkkBkkkkkkkkkkkkkkkkkkkkkkBLGGGGLkkkkkELEkkkkkkkkkkkkkkkkkBBkkkkELkkkkGLLLLcLGBkkkkkBLccGGGGLccGkkkkEEBkkkkkBBpppBBBBBBBkkkkLkYBBccccccccGBkkkkkkBccccccccLkkEEkBNNNNLkkkkkkkkkkppBBkkEEkkkBLccccGBBkBBBBBBBBBLkLckBkkkkkkkkkkkkkkkkkkkkkkkkkkkkBBR..............",
  "........................dBBkkB....ddBkBkkkBkkkkkkkkkkkkkkkkkkkkkkkkEEkkkkkkkkkkkkkkkkkkkkkkkkLEkkkkkkkkkkkkkkkkkkkBGGLLcGBkkkkkkELBkBBBBkkkkkkkkkBBBBBBBEkBBBBBBppBBBkkkkkkkkkkBBBpLBkkkkEEkkkkkkkkkkkkkkkkkkkkkkkEEkkkkkkkkkkkBBBBBBBBBWdkBcLBBBBBkkkkkkkkkkkkkkkkkkkkkkkkkBBBR.............",
  ".....................................................kBBBkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkEBkkkkkkkkkkkkkkkkkkkkkkBBkkkBBBkkkBRBkkkkBBBBBBBBBBBBBBBBBBkWYYYWWWWWWYYBYBBBkkkkkkkkkkkkkkLLkkkkkkkkkkkkkkkkkdBkkkkLLkkkkkkkkkBBBBYYBYBBdBBBBcLBBBBBkBBBBBBkkBkkkkkkkkkkkkkkkkBBBR............",
  ".....................................................................kkkkkkkkkkkkkkkkkkkkkkkkkL..............ddBBdddddd.BdddddBd..BkkkkkkkkkkkkkkkkkkBBB.dBBddWdBBdBdBdWdBdRWdBBBBBBBkBkkkLkkkkkkkkkkkkkkkdBBBBWRkdOkkBddBddkBBdddddWWWBBWdLcBBBkkkkkkBBBBBBkkkkkkkkkkkkkLEkkkBBWR...........",
  ".......................................................................Lkkkkkkkkkkkkkkkkkkkkkk....................................pEkkkkkkkkkkkkkkkkkkBd...................................kkkkkkkkkkkkBdBBBBBWRWOd..................WBdddBLcBkkkkkkkkkBBBkkkkkkkkkkkkkkkkLLLkkBBWR..........",
  ".......................................................................LkkkkkkkkkkkkkkkkDkkELL.....................................LDDDDkkkkkkkkkkkkkDL....................................BBBBBBkkkkdBBBBBBBBRLBRR.................WWdWdBBLcBkkkkkkkkBBkkkkkkkkkkkkkkkkkkkELEkkBBWR.........",
  ".......................................................................NBkkkkkkkkkkkDLLLkkkLNm.....................................LDDDDDDDDDDDDDDDDDLa.....................................BBkBBBkkBdBBBkkkkBOOO..................WYWWWBBBccBkkkkkkkkkBkkkkkBkkkkkkkkkkkkBLLLLLkBBRR........",
  ".......................................................................NpkkkkkkkkkkkLaaLkkkkLN.....................................LkDDDDDDDDDDDDDDDDLa.....................................YBBBkkBkBBBBBkkkkdOOOO................WWWWWBBBBcckkkkkkkkkkBBkkkkNNLBBkkkkkkkkBBLLLLLkBBR........",
  ".......................................................................NLkkkkkkkkkkkLNLaBkkkLN.....................................BkkkkDDDDDDDDDDkDkLa.....................................YBBBBBBBdBBdBkkkkdROOO...............WWdWWdBBBBcckkkkkkkkkkBBBkkkLaNNNNpBkkkkBkBLLLLLLkBWR.......",
  ".......................................................................NNkkkkkkkkkkLNLNLLkkkLN.....................................BkkkkDDDDDDDkkkkkkLa.....................................BkBBBBBBBBBdWkkkBRWR................RWWWWdBBkBccGkkkkkkkkkBBBBBBkLaLLNNNNNLBkkkkBLLGGLLkBWR......",
  ".......................................................................LNLLkkkkkkLBLm.mNLkkkLL.....................................NLkkkkkkkkkkkkkDkkLN.....................................kkkkkkBkdBBBBBkkLOLOO...............WWWWWBBkBccLkkkkkkkkkBBBBBBBBkNNaL...NNNNpBBkBBLLELLkBWR.....",
  "..........................................................................NLkkLLpNaN...NLkkkLL.....................................NNLLLkkkEEDELLLLLLLN.....................................kkkkkkkkdBBBBBBkLROOOO.............WWWWdBBkBccLkkkkkkkkkBBBBBBBBkkLNLLL.....NNNNpBBBBddBkBBWR....",
  "...........................................................................NLLNNN......NNLLLNN........................................NNLLLLLLLNNNNNNNL.......................................dBkkkkBBBBBBBBROOOOO............dWWWWBBBBccLkkkkkkkkkBBBBBBBBBkkkLNLNN......NNNNNpBBBWWBBBWR...",
  ".........................................................................................NNL............................................NaN........................................................dkkkkkkBBWOOOOO............WWWWdBBBccLkkkkkkkkkkBBBBBBWYkkkkkLNLN......LNNLNNNNpBBYBBdWR..",
  "....................................................................................................................................................................................................dkkkkkkkdOOOO............WWWWdBBkLcLkkkkkkkkdRBBBBBBWBk..BkkkNmNN......m..NNNNNNLpBBWWWR.",
  ".....................................................................................................................................................................................................dkkkkkkROO.............WWWWWBBkLcGkkkkkkkk.RYBBBBBWBkB...kkkBNmNN.........Nm...NNmLBWWWR",
  "............................................................................................................................................................................................................................WWWWdBkpcGkkkkkkkB..WBBBBBWkkWk....kkkBNmmm................ORBWWW",
  "...........................................................................................................................................................................................................................dWWWdBBBcckkkkkkkd..WBBBBddkkBBd....dkkkLNmLm...............OORWBR",
  "...........................................................................................................................................................................................................................WWWWBBBccBkkkkkkd..RYBBBWBkkBBBd.....BkkkNmNNm..............OO..WR",
  "..........................................................................................................................................................................................................................WWWWWBBLcBkkkkkkB...dLkBWBk..kBBB......kkkBNmmmm.............OO....",
  "..........................................................................................................................................................................................................................WdWWdBpcGkkkkkkk......dWW...kBBYB.......kkkLLmm....................",
  "..........................................................................................................................................................................................................................WWWWBBcckkkkkkk..............WWW........dkkkNmmm...................",
  "..........................................................................................................................................................................................................................WWWBBLcBkkkkkkd..........................kkkBNmm...................",
  "..........................................................................................................................................................................................................................WWdBBcGkkkkkkk...........................dkkkLNmm..................",
  "..........................................................................................................................................................................................................................WWBBcckkkkkkkd............................kkkkNNm..................",
  "..........................................................................................................................................................................................................................BWBLcBkkkkkkB.............................dkkkkNNm.................",
  "..........................................................................................................................................................................................................................BLkcckkkkkkk...............................kkkkBNm.................",
  "..........................................................................................................................................................................................................................BELLLkkkkkkB.......................................................",
  "..........................................................................................................................................................................................................................YELELEkkkkB........................................................",
  "..........................................................................................................................................................................................................................kLLYBLEEkkd........................................................",
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
    waveAmp: 9,
  },
  {
    name: "rayquaza",
    palette: RAY_IMAGE_HEX,
    behavior: "prowl",
    image: RAY_IMAGE,
    renderScale: 0.8,
    waveAmp: 11,
  },
];
