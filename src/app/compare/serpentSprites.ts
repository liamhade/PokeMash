// The legendary serpents that raid the play area: Gyarados and Rayquaza. Both
// are EXACT pixel traces of reference art (trimmed, downsampled, octree-
// quantized, white background flood-filled away), NOT hand-drawn: Gyarados from
// a side illustration (gyrados side.png), Rayquaza from a model-kit photo
// (ray_side.webp). Each is one whole sprite that natively faces right and
// mirrors with scaleX for leftward travel, and WAGS as one body (see the
// .serpent-wag class, hinged at each serpent's head) rather than snaking, since
// a photographed pose can't be cut into a uniform tube of undulating segments.
// The palettes are machine-derived from the photos, so their letters carry no
// fixed meaning; they are just the traced colors.

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
  k: "#1FA85E", B: "#53B16D", L: "#E66852", N: "#94CEA8",
  W: "#72C38E", c: "#FEFEFE", d: "#65BB86", R: "#DDCC17",
  p: "#1A5A33", G: "#F4A29C", E: "#95985B", D: "#B3DDC6",
  Y: "#9FB728", O: "#AEC42B", m: "#266A48", a: "#9EC557",
  b: "#A86035", e: "#D9D552", f: "#A5744B", g: "#1B2D21",
};

// Rayquaza: an exact pixel trace of the reference model kit (ray_side.webp,
// downsampled + octree-quantized), kept whole and wagged as one body.
const RAY_IMAGE = [
  "...................................................................................................................dWN...................................",
  "...................................................................................................................Bkkd..................................",
  "...................................................................................................................NkkkB.................................",
  "....................................................................................................................kkkkB................................",
  "....................................................................................................................WkkkkB...............................",
  "....................................................................................................................DkkkkkB..............................",
  ".....................................................................................................................kkkkkkB.............................",
  ".....................................................................................................................NkkkkkkB............................",
  "......................................................................................................................kkkkkkkB...........................",
  "......................................................................................................................BkkkkkkkB..........................",
  "......................................................................................................................NkkkkkkkkW.........................",
  ".......................................................................................................................BkkkkkkkkW........................",
  ".........................................................................................................................BkkkkkkkN.......................",
  "..........................................................................................................................NWkkkkkkN......................",
  ".............................................................................................................................kkkkkkN.....................",
  "..............................................................................................................................kkkkkkD....................",
  "..............................................................................................................................NkkkkkBNNND................",
  "...........................................................................................................................NBkkkkkkkkBaEaaNNN............",
  "........................................................................................................................eEkkkkkkkkkkkkkkBBkkkBD..........",
  "......................................................................................................................DBRBkkkkkkkkkkkkkkkkkBBkBD.........",
  ".....................................................................................................................WkaRBBBBkkkkkkkkkkkkkkkkBBBN........",
  "....................................................................................................................dBdaakkkkkBBBBBkkkkkkkkmpkkBd........",
  "...................................................................................................................BBWBRakkkkkkBkkkkkkkkkkkkmgkkBd.......",
  ".............................GLL..................................................................................BdWBBREkkkkkkBkkkBBkkkkkkkBggmkBW......",
  "..........................G.LfBLG................................................................................BWWBBkRBkkkkkkBBkkfcfBBkkkkBmggmkcN.....",
  "........................GLbBkkkBL...............................................................................ddWBBkORkkkkkkkBBBkccccLffBkkBmcYpkBN....",
  ".....................GLbckkkkkkkfL.............................................................................NdWdBkORBkkkkkkBBBBckLLL..GLLEBBBBckBBN...",
  "....................GbkkkkkkkkkkkL.WD.........................................................................DBWdBkORkkkkkkkBBBBWkkBLLG....LLLEBWWBBBN..",
  ".....................fkkkkkkkkkkBBBkBNBkBBBBdWN...............................................................dWWBkORBkkkkkkBBBBcBdkkBcL....GLGLLLEBBdBD.",
  ".....................LkkkkkkkBBBBBBcpmcBkBBkkkkBWD...........................................................NdWBBaRBkkkkdcWBBBckN..kkEGL......GG.GGEBcd.",
  ".....................LkkkkBBBBBBBBBcppcBORRROBBBBkBN........................................................DBWdBBRBkkkkWcNBBBBkN...NkkLGL............NBW",
  "......................BkBBWdddBBBBBcppkRRYBYRROBBBBkd.......................................................WWWBBRYkkkkW.NBBBBk......dkBLLG............NW",
  "......................BWWWWddBBBBBBBkgRRkkkkkBROBBBBBBN....................................................NdWWBORkkkkd..NkBBB........kkEGLG.............",
  "....................NWNNWWdBBBkBELLfkgcRBkkkkkBRBBBBBBBN...................................................dWWdaRkkkkk................DkkfGG.............",
  "....................NNNWddBBBBELLLLLkgmBcckkkkBRRBBEBdBBN.................................................NdWdBRBkkkkD.................dkkLG.............",
  "...................BdWWdBBBELLLLLLLBkppkkY.YYYRcBRRRReBdBN................................................dWWBOOkkkkd...................kkBL.............",
  ".................NNBBWBBELLLLLLLfBkkkkgkkk....kkkRYkBeeadBN.............................................dBBBdcRBkkkk....................WkkfL............",
  "................NNNdcBELLLLLLfckkkkkkkd.NDNd.kkkkcBkkkaeBdB............................................NdWBBmYYkkBkW.....................dWN.............",
  "...............NNNWWmmELLLLfkkkkkkkkkkN.......dkkYYkkkkeedBW....................................GGGGGGGLBWWcpgpkkkk......................................",
  "..............NWNaeBcgpLfBkkkkkkkkkkcL..........dkRBkkkBeWdBD................................GLLfEEEEEEcBWWkgBBmpkN......................................",
  ".............NWeeaYccpgkkkkkkkkkkkkkk............dBRBkkBRNWBW................................GcBBkkkkkkkWBBppBBcBB.......................................",
  "............NWeeBkkYYkppkkkkkkkkkkkkkbG...........dBROcYRWWBd................................LEkBBBkkkkkBcpgpkBBBBd......................................",
  "...........NWeeBkkkYckkpBkkkkkkkkkkkkbG............BkYOROkBmcNW..............................LBkBkkkkkkkBBBmgpBBBkN......................................",
  "..........NWNeBkkkcckkkN..Gbkkkkkkk...G.............kkkpcpBBdBBG............................GLBkBkkkkkkBBBBWmgkBBB.......................................",
  ".........DWWaRkkkcckkd.......kkkkcbLG...............NmpmmkBNNBcEbbbbL.......................GLkkkkkkkckWdBdWBgkBkN.......................................",
  ".........WWWBRcccckkN.......Lk.bLG..................DBBkEcEWNBBBkkkkf........................EkkkkkkcpkBBkBdcpkBB........................................",
  "........NWWBYcYYckk.........G.......................kkkkLLLdWdBBkkkkcG......................LEkkkkkkppkkkkkBBpBBW........................................",
  ".......NdWBYRkkkkd................................LbkkkkLLLBWdBBkkkkBG......................LBkkkkkkpkmkkkkBkpBBN........................................",
  ".......dBaYRkkkkW...............................LbcpkkBkfLLBWWBBkkkkkL.....................GLkkkkkkkpkBmmBdBmmpk.........................................",
  "......NaRRRBkkkN...............................GbkkcckBkELLEWWBBBkkkkL.....................GfkkkkkkkpkBmgBcBBcmk.........................................",
  ".....DaRBkYckkW.................................bkkcckkkBLLEBdBBBkkkkb.....................LEkkkkkkkckBkpBWBBBBB.........................................",
  ".....WREkkYckd..................................LckcckkBBLLLBddBBkkkkcG....................LBkkkkkkkkkBkgkcBBBBN.........................................",
  "....DaekkkRk....................................LpkcckkBBLLLBddBBkkkkBG....................GLEkkkkkkkkBkgkcBBBBN.........................................",
  "....WeEkkcYk....................................GckcckkBkfLLBBdBBkkkkkL......................GLEkkkkkBBkgkBBBBBD..............NWWN.......................",
  "....deckYRkD.....................................bkccckBkELLEcdBBkkkkcL........................GLckkkBBkgkBBBBBD...........NWBBBd........................",
  "...NdERRYkd......................................bkccckBBBLcfBdBBkkcbLG..........................GLckBBmgkBBBBBBddWWNDD...WBBBBkN........................",
  "..NmBOOkkk.......................................LckcckkBBLcLBdBBBLG...............................bkBkmgkkBkkBBBBBBkkkkBBBBBkkk.........................",
  "..WkpbkkkN.......................................LcpppkBBBLLLBdBBB.................................kkBkppkkkkkkkkkBBBBBBBBBBdkkdN........................",
  "..BWkmppk........................................GLLLLBkBkEcbBWWkB.................................dkkkpgkkkkkkkkkkkkkkkBBBBBkkcN........................",
  ".NBBkkkkB..............................................WBkkppkkmd...................................NpmpgpppmN....DWdkkkkBWBBBBN.........................",
  ".NBELfkkD...............................................mmmcpmkmd...................................dkBkYckBkN..........NBkkkBBN.........................",
  ".WBLLEkd...............................................DBWBROcWcB...................................BkaRRRBBBN............BkkkkN.........................",
  ".BBLLBk.................................................BBYRORaBBD..................................kaRBkOYckD.............NNDD..........................",
  "DBELLBd.................................................BBRBkBeaBW.................................NBRBkkcRkk............................................",
  "NBELLkD.................................................WBRBkkEeBB.................................BaakkkERkB............................................",
  "NBLLEB..................................................NBRBkkBeaBN...........G.......G...........NBeEkkkOakW............................................",
  "WBLLBN...................................................BOYkkBaeBBD.........GcbbbbbbbcL..........BceBkkBRBkD............................................",
  "WBLLB....................................................WBRBkkaedBB.........LkkkkkkkkkL.........BBWeBkkROkB.............................................",
  "WELLd.....................................................kORBkOeWWBBD.......LkkkkkkkkkbG.......ddWdROBRRBkN.............................................",
  "WfLfN.....................................................WkORRRBdddBkN......bkkkkkkkkkbG.....NBdWdcBRRYBBB..............................................",
  "NLLED......................................................BkBYREBaaaBkBN...EckkkkkkkkkBfN..NdkaeeRORYkBBkN..............................................",
  ".LLB.......................................................NkkkBRRRRRRakkkdNkkkkkkkkkkkkkkNkkBeRaEEROkBBBd...............................................",
  "GcLN........................................................dkBkOOkBBaRaBkpkkkkkkkkkkkkkkkpkBRRBkkkOYkBBB................................................",
  "GLfN.........................................................BkkYOkBBkERBkpkkkkkkkkkkkkkBkpkaRBkBkkRBkBkD................................................",
  "DkkD..........................................................BkBRBkkBkOOkpkkkkBBBBBBBkkkBgkRBkkkkORBBkD.................................................",
  ".kk............................................................BkERBkkkBRkpBBkkkkkkkkkkBEBgcRBkkkORBkkD..................................................",
  ".kk.............................................................dkBRYcBYRbpfLLLLLLLLLLLLLBpcRRYOROBkB....................................................",
  ".NN..............................................................NkkYRRYkppfLLLLLLLLLLLLLBmpkcOYBkkW.....................................................",
  "...................................................................WkkkkkpkBLLLLLLLLLLLLEkkpkkkkkd.......................................................",
  ".....................................................................NkkkpkkkkkkkkkkkkkkkkkpkkkW.........................................................",
  "........................................................................NNkkkkkkkkkkkkkkkkkNDD...........................................................",
  "..........................................................................dkkkkkkkkkkkkkkkkN.............................................................",
  "............................................................................fkkkkkkkkkkkcG...............................................................",
  "............................................................................LckkkkkkkkkkbG...............................................................",
  "............................................................................GBkkkkkkkkkkb................................................................",
  "............................................................................GfkkkkkkkkkkL................................................................",
  ".............................................................................fkkkBBBBBkBL................................................................",
  ".............................................................................LLLLLLLLLLL.................................................................",
];

export type SerpentSprite = {
  name: string;
  palette: Record<string, string>;
  // "cross": swims straight across at a fixed height, alternating direction.
  // "prowl": slithers in from a side edge, dives, then wanders the open water.
  behavior: "cross" | "prowl";
  // An exact traced sprite (tail-to-head, natively facing right), rendered whole
  // and wagged as one body — the model art can't be cut into a snaking tube.
  image: string[];
  // CSS transform-origin for the wag rotation, placed at each serpent's HEAD so
  // the long tail sweeps: Gyarados' head sits mid-right, Rayquaza's up-right.
  wagOrigin: string;
};

export const SERPENTS: SerpentSprite[] = [
  {
    name: "gyarados",
    palette: GY_IMAGE_HEX,
    behavior: "cross",
    image: GY_IMAGE,
    wagOrigin: "86% 44%",
  },
  {
    name: "rayquaza",
    palette: RAY_IMAGE_HEX,
    behavior: "prowl",
    image: RAY_IMAGE,
    wagOrigin: "82% 24%",
  },
];
