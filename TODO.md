# CODE

## FUNCTIONAL

- [ ] (**consolidate components**) combine panelRight and panelLeft into the comparison screen, since that's the only place that we would need the information.

- [ ] (**anon->sign-up**) The user gets 20 free comparisons (that number should be easily adjustable in the backend code). After that, the user is prompted with a sign-in modal in the center of the screen (the rest of the screen should be blurred). All sign-in functionalities should leverage `Supabases` built-in sign-in functionalites. The user should be prompted to sign-in with their Google account (OAuth, which Supabase natively supports). After a user signs-in, the comparisons / rankings that they performed while anonymous should automatically transfer over to their current account.

	- [ ] (**account handling**) A red `Sign Up` Pill button will be created in the upper right in the `Nav Bar`. When the user clicks it, the same modal that pops-up in the **anon->sign-up** ticket should appear. The user should be prompted to sign-in with their Google Account (OAuth). Once the user signs in, a person icon appears in the upper-right. If they click on the person icon, it shows a dropdown modal that contains their email address that they are signed in with, as well as a sign-out button.

- [ ] (**move comparison pool rule into the database**)
	- *PROBLEM*: The rarity rule above lives in TypeScript because the app's read-only key can't create DB objects. That means an extra `cards` read per request and logic split from the data.
	- *SOLUTION*: Apply `supabase/migrations/20260630_comparison_pool.sql` (creates `comparison_pool()`), then switch `/api/comparison/next` back to `supabase.rpc("comparison_pool")`. Needs someone with Supabase DB access.

- [ ] (**add `supertype` / `subtypes` columns to `cards`**)
	- *PROBLEM*: Three pool filters are fragile name/regex hacks because the data has no card-type info: energy detection (`isEnergyCard` name regex), Item/Stadium/Tool exclusion (the 794-name `excludedTrainerNames.ts` list, which goes stale with new sets), and the GX/V/ex "buzzword" mechanic detection (`FEATURED_MECHANIC` regex).
	- *SOLUTION*: Add `supertype` (Pokémon | Trainer | Energy) and `subtypes` (e.g. Item/Stadium/Supporter for Trainers; V/VMAX/ex/GX/… for Pokémon) columns, backfilled from the Pokémon TCG API (match by set + collector number, fall back to name). Then replace: energy filter → `supertype = 'Energy'`; Item/Stadium/Tool → `supertype='Trainer' AND subtypes && '{Item,Stadium,Pokémon Tool}'`; buzzword keep → `subtypes` contains a mechanic tag. NOTE: "full art" is NOT a type — it stays in `rarity` (Ultra/Illustration/Special Illustration/etc.), so the rarity rules are unaffected. Needs Supabase DB write access + a one-time backfill job.

- [ ] (**increase new card novetly**) 
	- *PROBLEM*: Card comparisons don't feel new enough. Currently, the comparison function often compares the same cards over and over again, rather than pulling new cards from the database. With `Keep Winner` on (the preferred mode), `supply_winner_with_fresh_card` always picks the UNSEEN card *nearest in rating* to the winner — an informative matchup, but it keeps surfacing the same narrow power band, so it feels repetitive.
	- *SOLUTION*: There should be a toggle called `Prioritize New Cards` that makes sure that whatever card we fetch is a card that we haven't already seen. If we've already seen every card, then we choose the maximally information rich pairing, just as we do now.
	- *ALT / refinement (keeps `Keep Winner`)*: rather than a hard binary toggle, make challenger selection an explore/exploit policy. Within the unseen pool, instead of always taking the single nearest-rating card, either (a) **epsilon-greedy**: with prob. ε (~0.3) pick a random unseen card from anywhere in the pool, else the nearest-rating one; or (b) **soft band**: pick randomly among the N closest unseen cards. Both keep matchups reasonable while injecting novelty. ε would be a good tunable / the `Prioritize New Cards` toggle could just raise ε toward 1.

- [ ] (**filter follow-ups**) The price/era/series Filter (see DONE.md) has known gaps:
	- *Persist filters across navigation* like the comparison pair already is (currently they reset to none on leaving Play).
	- *Series list is static* in `FilterModal` (`SERIES`) and mirrored by the API's `ERA_SETS` — both must be regenerated when a new series ships. A `distinct_sets()` RPC (needs DB access) would let the dropdown load live, like the old rarity filter did.
	- *Price gaps*: ~10% of cards have null `market_price` (silently excluded when a price bound is set); some rows have messy prices (e.g. `market_price` 0 with a high `lowest_price`).

<!-- Flesh this out more -->
- [ ] (**compare from `See Rankings`**) Add abilitity to click on card from `See Rankings` to compare that card on `Play` to another card.

<!-- Flesh out -->
- [ ] (**price reveal after selection**) After a user selects a card, before the two cards disappear, display their prices below them.

- [ ] (**averaged hover color**) When hovering over a card during `Play`, the hover color should be the *average pixel color* of that card.
	- *ARCH*:
		- Add `average_pixel_color(Card) -> RGB` function

<!-- Flesh out -->
- [ ] (**add `dark mode` toggle**) Pokemon themed `Moon` and `Sun` toggle?

## BUGS

- [ ] If the user selects a 

# LEARNING

## the arm that looked best was the model's own, barely rotated

- [ ] Three arm attempts failed before the fix: the GBA sprite arm (right anatomy,
  but its dithered teal pixels read as noise next to the smooth photo body) and
  two hand-drawn capsule arms (right palette, but "stick + ball" proportions).
  The winner was the model photo's own arm at a gentle -18° instead of the old
  -38°. Why did the steep rotation make a natural limb read as a "blocky" blob
  (think: what happens to a mostly-horizontal forearm + forward claws when you
  rotate them 38°), and why does material continuity (same photo source as the
  body) matter more here than anatomical detail?

- [ ] VISIT_GAP_MIN_MS/SPAN became 15_000/45_000 — a min + span pair rather than
  a min + max. What does storing the randomized gap as (min, span) simplify at
  the call site (`min + Math.random() * span`), and what's the off-by-one-ish
  trap if someone later "fixes" span to be the max?

- [ ] The head kept landing off the neck because its placement (`hx`/`hy`) was
  eyeballed against zoom renders. The fix measured the actual geometry — the
  neck-join sits at head-local ≈(135, 85) (read off a gridded render) and the
  body tube's centerline at body-local y=100 — and solved `hy = 100 - 85` so the
  join lands ON the tube axis, with the stub length chosen so the tube ends ~30px
  into the join. Why does anchoring two measured reference points beat iterating
  visual offsets, and what changes when someone later swaps in a different head
  crop?

- [ ] The previous graft's tube stub ran 145px past the neck join, sliding under
  the jaw (the stray yellow stripe below the mouth). Explain how ONE stub-length
  number encodes the difference between "the body flows into the head" and "a
  pipe pokes through the head", and why the overlap should be measured from the
  join point rather than the head's bounding-box edge.

- [ ] The head read as "too low / disconnected" because the model's head axis
  tilts ~34° DOWN (crest→snout), so on a horizontal body the mouth drooped below
  the neck line. Rotating the cropped head ~32° CCW before grafting makes it
  point forward and join the tube naturally. Why does a rigid rotation (not a
  reposition) fix a droop that repositioning couldn't, and what does that say
  about matching a grafted part's axis to the host body's axis?

- [ ] The arm looked detached because it was a horizontal forearm placed below
  the tube (gap at the shoulder). Rotating it ~38° CW so it angles down-forward,
  overlapping the shoulder INTO the body and compositing it ON TOP, made it read
  as attached with the hand clear of the silhouette. Why is "overlap the joint +
  paint on top" the 2D stand-in for an actual attached limb?

- [ ] Masking the head's neck with a RECTANGLE (x<178 & y>145) also bit a chunk
  out of the head's throat and clipped the neck spike. The fix cut along a
  DIAGONAL that follows the neck tube (a cross-product side test against a line),
  removing only the tube while keeping the throat and crest. Why is a straight
  half-plane cut (line + which-side) enough here, and how does the sign of the 2D
  cross product `(p-a) x (b-a)` pick the side to erase?

- [ ] The hand kept disappearing because the arm was composited BEFORE (under)
  the body. Compositing the arm AFTER the head/body — and hanging it below the
  silhouette — makes the claws show. What does this say about paint order being
  the whole story for a flat 2D graft, versus real depth?

- [ ] The leftover wasn't body clutter — it was the head crop's own down-curving
  neck (the model's neck bent toward the coiled body below in the S-pose), which
  hung down as a second neck once the straight body tube already formed one. The
  fix masked that neck off the head crop (keeping crest + skull + jaw) so the body
  tube is the only neck. Why does unrolling a POSED model inevitably leave a neck
  pointing the "wrong" way, and why is masking it on the head — not cutting the
  body — the right place to fix a double-neck?

## cut the neck clutter exactly where the clean tube ends

- [ ] Keeping the body tube under the neck (cut_x 1230) left mangled unroll
  clutter protruding above the neck. The fix found the exact cut point by
  scanning each column's opaque vertical EXTENT: the clean tube held a steady
  ~66px thickness up to x=1165, then jumped to 80→171 where the mangled head
  began. Why is "thickness suddenly balloons" a reliable, geometry-only signal
  for where a straightened tube ends and unroll garbage starts — no image
  understanding needed?

## SMIL for WebKit, a solid neck graft + arm, and a low U-turn

- [ ] The snake wave went invisible in Safari because WebKit won't animate a CSS
  `transform` on an SVG `<g>` (it animates fine in Chrome — which is why the bug
  hid). Switching each band to a SMIL `<animateTransform type="translate">` with
  a negative `begin` fixed it everywhere. Why does a negative `begin` reproduce
  the same per-band phase offset the old `animation-delay` gave, and what's the
  general lesson about verifying a CSS feature in the *target* engine (WebKit),
  not just the one your headless screenshot uses?

- [ ] The head kept detaching because the graft BUTTED the head against a cut
  body edge; the fix keeps the clean body tube running UNDER the neck (overlay,
  not cut-and-join) so a solid multi-pixel bridge survives the downsample and the
  band-wave shear. Relate this to why adjacent SnakeSprite bands (continuous
  columns of one image) never seam but two separately-authored pieces would —
  what invariant does "one continuous source image" preserve that a graft breaks?

- [ ] The two low waypoints use POSITIVE `y` (`h * 0.02`), below the `y = 0`
  floor line, where the serpent's positioner was previously only ever `<= 0`.
  Why does that push the body under the board and let the play area's
  `overflow-hidden` clip whatever dips past the screen bottom, rather than
  needing an explicit clamp?

- [ ] Halving `SWOOP_SPEED` (255 -> 128) more than doubled the visit: the
  deeper, flatter sweep also lengthened the path, so the out-and-back is now
  ~35s. Given the episode end is derived from `swoopMs = pathLen / SWOOP_SPEED`,
  why did the peek loop have to grow to 8, and what's the argument that "slower +
  bigger path" compounds into a visit long enough to feel broken?

## steeper out-and-back swoop, timed by speed

- [ ] The swoop path is now `[...out, ...out.slice(0, -1).reverse()]` — the same
  `out` waypoints, then reversed (minus the shared apex) so it flips and retraces
  its trip. Why does dropping the last element before reversing avoid a duplicated
  apex point (and a zero-length segment there), and what makes the single `dir`
  flip land exactly at that apex?

- [ ] Timing switched from a fixed `SWOOP_MS` total to `segMs = segLen /
  SWOOP_SPEED` (px/s). Explain why the old fixed-duration approach made the
  serpent move FASTER on bigger screens (path scales with width) while the
  speed-based one keeps a constant visual pace — and why "50% slower" is now a
  one-number change even though the out-and-back path is also longer.

- [ ] The unrolled body's head came out mangled, so the clean head was cropped
  from the SAME photo (`head_crop`) and composited onto the neck at high-res
  BEFORE tracing to a sprite (scratchpad `graft.py`), rather than pasting two
  already-quantized pixel grids. Why does grafting at the photo resolution and
  then quantizing ONCE give a seamless single-palette sprite, whereas stitching
  two traced grids would not?

- [ ] Rayquaza's swoop is a `catmullRom` spline through 8 control points, flown
  by chaining ~70 short `translate` transitions whose per-segment duration is
  each segment's share of the total path length (so speed is constant and the
  whole thing lasts `SWOOP_MS`), each with `ease: "linear"`. Why does linear
  easing per tiny segment read as smooth constant motion while the segments'
  own `ease-in-out` (the Gyarados default) would visibly pulse — and why must
  the sprite `dir` flip exactly at the apex where `dx` changes sign?

- [ ] `unroll.py` finds the body centerline as the skeleton's LONGEST path via
  two BFS passes (farthest node from an arbitrary start, then farthest from
  THAT) — the classic tree-diameter trick. Why does that reliably return the
  tail-tip→head-tip spine and ignore the shorter arm/fin/crest branches, and
  where would it break if the skeleton had a big loop rather than being tree-like?

- [ ] The perpendicular resampling walks outward from each spine point and STOPS
  at the first background pixel in each direction, instead of sampling a fixed
  half-width. Work through why that rule prevents a normal ray at the inside of a
  tight S-bend from bleeding into the adjacent coil — and why "elongate the source
  pose" (not a change to the wave code) is what finally made Rayquaza snake, given
  the previous note said the limit was the source pose. Also: why did the unrolled
  sprite need its own smaller `renderScale` rather than sharing Gyarados'?

- [ ] `SnakeSprite` slices the traced sprite into vertical `<g>` bands and each
  animates `translateY(var(--amp))`, where `--amp` is in svg USER units (design
  px * PX) rather than screen px. Why does using user units make the wave scale
  correctly with `SERPENT_IMAGE_SCALE` for free, and why did that let the bands
  live in ONE `<svg>` (with `overflow: visible`) without the subpixel seams that
  separate per-band `<svg>`s at a fractional scale would have produced?

- [ ] Each band's `animationDelay` is `-SNAKE_PERIOD_MS * SNAKE_WAVES * xc` (xc =
  0 at the tail, 1 at the head) and its amplitude ramps from `SNAKE_HEAD_AMP` at
  the head to full `waveAmp` at the tail. Work through why a delay that's LINEAR
  in position produces a crest that travels head→tail at constant speed, and why
  this column-wave snakes an elongated body (Gyarados) convincingly but only
  wiggles Rayquaza — what property of the *source pose*, not the code, is the
  limit?

- [ ] The Gyarados source (`gyrados side.png`) has its head on the LEFT, but it's
  traced from a horizontally-FLIPPED copy so `GY_IMAGE` natively faces right.
  Walk through why that flip is required given the render applies
  `scaleX(serpent.dir)` and the cross-behavior sets `startX`/`endX` from `dir` —
  what would a un-flipped grid do on a left-to-right (`dir === 1`) crossing?

- [ ] Once both serpents became single `image` sprites, the whole segmented path
  went away: `SerpentPiece`, `pieces?`, `SERPENT_SCALE`/`AMP_SCALE`/
  `SERPENT_OVERLAP_PX`/`WAVE_LAG_MS`, the `.serpent-piece`/`serpent-undulate`
  CSS, and the per-piece render branch. What's the YAGNI case for deleting that
  hard-won, working code outright (rather than keeping the `pieces?` union "just
  in case"), and why is `wagOrigin` per-serpent data rather than one shared CSS
  `transform-origin` like the wag animation itself?

- [ ] The tracer quantized the model with `MEDIANCUT` first and the red fin
  plates collapsed into one brown (`#976446`); switching to `FASTOCTREE` split
  out a real red (`#E66852`). Given the source genuinely had ~7700 red pixels,
  why did median-cut still starve them while octree didn't — what does each
  algorithm optimize, and why does a big smooth green gradient punish median-cut
  here? And why must the white-background removal be a border flood-fill rather
  than "map white -> transparent" (think: the white claws/teeth)?

- [ ] `SerpentSprite` now has optional `pieces?` XOR `image?`: Gyarados stays a
  segmented strip that snakes via per-piece `serpent-undulate`, while Rayquaza
  is one `RAY_IMAGE` grid rotated by `.serpent-wag`. Why can a hand-authored
  tube be sliced-and-undulated without seams but a traced photo can't (what did
  the uniform-thickness pieces guarantee that the trace doesn't)? And why is a
  whole-sprite rotation hinged at `transform-origin: 82% 24%` the right way to
  fake swimming for a rigid S-posed image?

- [ ] Both `GS_FIN`'s white prongs and `RS_FIN`'s red plates sit in rows the
  neighboring segments leave `.` (empty), yet `RS_RING`'s yellow oval still has
  to hug the LEFT of its 10-wide slice. Why does the 3-column head-ward overlap
  clip the ring but not the fins — what's different about the rows each occupies?

- [ ] Redrawing Gyarados kept the committed `GS_HEAD`/`GS_FAN` grids untouched and
  only swapped `GS_SLICE`/`GS_JOINT` (spike-on-every-segment) for a smooth
  `GS_BODY` plus an interval `GS_FIN`. What did reusing the proven head/tail
  grids buy over regenerating all ten pieces, and how does deleting `RAY_FACE`
  (and the `form` state it drove) rather than leaving it unused reflect YAGNI?

- [ ] Every serpent piece now keeps its rightmost 3 columns plain tube — and `RS_RING` additionally backs its ring with solid green instead of transparent cells. Trace how the 3-cell overlap's paint order (head-ward neighbor on top) turned the first draft's rings into "C" shapes, and which 1px seam holes the solid backing closes that the overlap alone couldn't.

- [ ] The heads, face and fin grids are frozen output of a scratch painter script (shape bands + an auto-outline pass that treats off-canvas as FILLED) rather than hand-typed rows. Why is "off-canvas = filled" exactly the outline rule a piece that must seam into its neighbor needs, and when does freezing generated art into the source beat checking the generator itself into the repo?

## 3x side-view serpents: crossing Gyarados, prowling Rayquaza

- [ ] Switching from top-down to side profiles let the whole rotation subsystem (cumulative shortest-turn angles, the length-sided square clearance) collapse into a `scaleX` flip and a plain box check. Why does a side view make arbitrary-heading rotation WRONG rather than merely unnecessary (what happens to "up" when a side profile rotates 180°?), and what did the clearance box get back by no longer having to cover a turning arc?

- [ ] At 3x, Rayquaza's clearance box (~380x280px) rarely fits beside the board, so `openWater` gained a second loop: vertical-only drift in his own lane before holding still. Why is vertical drift from an already-clear spot safe without re-checking horizontal card overlap conceptually — and why does the code still call `pathClear` on it anyway?

- [ ] Gyarados' crossing computes its speed FROM the distance and a fixed duration (`dist / (crossMs / 1000)`) while every other glide computes duration from a fixed speed. What does each parameterization hold invariant across screen widths, and why is "the visit lasts VISIT_MS" the right invariant for a crossing but the wrong one for a prowl beat?

## face-first entries, Rayquaza, connected tails, continuous flee

- [ ] The "teleport to the top of the card" was a sequencing bug, not a motion bug: the peeks were scheduled at fixed offsets from the episode START, so a long flee let `nervousPeek`'s `setWalkMs(350); setY(card.top + 2)` fire mid-run and override the glide. Why does chaining the first peek onto `walkTo`'s `onArrive` fix every flee distance at once, and what NEW race did that introduce that the `episodeRef` guard inside `nervousPeek` now closes?

- [ ] Tails disconnected because adjacent pieces' relative offset — sqrt(A_i² + A_j² − 2·A_i·A_j·cos Δφ) — exceeded the tube thickness at the fan/stem joint. The fix kept the big amplitudes but shrank Δφ (WAVE_LAG_MS 380→120) and split the body into 8-cell slices. Work through why many small phase steps preserve the whole-body S (the lag SUM is what shapes the curve) while bounding each joint's gap, and what the same reasoning says about vertex counts when approximating any curve with rigid segments.

- [ ] The face sprites are mirrored about the VERTICAL axis (`mirrorCols`) while the strips mirror about the HORIZONTAL (`mirrorRows`) — and the face renders outside the rotator while the strip renders inside it. Connect the two facts: which symmetry does each rendering context demand, and why would putting the face inside the rotator have turned a right-edge entrance upside down?

## detailed Gyarados + airtight card avoidance

- [ ] Both behind-the-board sightings traced to geometry the AABB checks silently ignored: the entry dive started OFF-SCREEN on the far side (path never checked), and turns rotate the strip about its center so the head/tail sweep an arc the resting box doesn't cover. Why does `gyaradosClear` clearing a LENGTH-sided square fix the rotation case for every heading at once, and what does it cost him on narrow screens where that square fits nowhere?

- [ ] All the pieces are authored as a 12-row top half run through `mirror()`, which is exactly why the eyes sit at half-row 9 (not the midline) and why the head can be rotated to any heading without a flip. What would drawing the full 24 rows by hand have cost across the five iterations this art took, and where does the mirror trick break down (think: the old side-view sprite's asymmetric silhouette)?

## top-down snaking Gyarados + open-space-only roaming

- [ ] The traveling wave is one shared `gyarados-undulate` keyframe with per-piece inline `--amp` and a NEGATIVE `animationDelay` of `-i * WAVE_LAG_MS` (tail is i=0). Work through why a negative delay makes the head the most phase-ADVANCED piece and thus makes the crest travel head→tail — and what the wave would do if the delays were positive instead?

- [ ] `openMeadow` checks the path at quarter points from her CURRENT position, which is why the episode-end walk-out couldn't reuse it (she starts behind a card, so every path sample fails and she'd freeze). What's the general lesson about preconditions baked into a helper ("start point is in open space") that hold in one call site but not another, and how does the target-only fallback loop encode the difference?

## Gyarados visits: chase, hide, nervous peeks

- [ ] The visit is scheduled on a dedicated `visitTimer` handle while everything INSIDE the visit runs on the interruptible `timers` pool, and `onClick` early-returns while `episodeRef.current` is true. Trace what would break under each alternative: the visit scheduled in the pool, or clicks left enabled mid-episode — which one loses Gyarados forever and which one strands Clefairy hidden with `episodeRef` stuck true?

- [ ] `openWater()` rejection-samples a spot whose box AND path-midpoint clear every card rect, giving up after 30 tries by returning his current position. Why is "hold position for a beat" the right degenerate behavior here (vs. relaxing the margin or teleporting), and why does checking only the midpoint — not 24 path samples like the old `cardOnPath` — suffice for his glides when it wouldn't have for her walk detours?

- [ ] The tail sweep is a CSS rotation of a second `PixelArt` stacked `absolute inset-0` over the body, hinged at `GYARADOS_TAIL_ORIGIN` percentages — but the whole stack sits inside the `scaleX(${-facing})` flip div. Why do the origin percentages need no adjustment when he turns around, and what WOULD have broken if the origin were expressed in pixels from the left edge instead?

## click dance replaces the scare

- [ ] The dance's three bars live in ONE CSS animation (`clefairy-dance ... 3` iterations) while the twirls are two JS `after(DANCE_BEAT_MS * n, flip)` timers, coupled only by the 800ms constant appearing in both files. What visual artifact appears if the CSS duration is edited without `DANCE_BEAT_MS` (or vice versa), and why was the facing flip not expressible inside the keyframes themselves (think: which element owns `scaleX`)?

- [ ] Replacing the scare deleted the `crouch`/`shaking` states, their JSX layer, and the `clefairy-shake` keyframes in the same commit rather than leaving them "in case we want trembling later". What's the YAGNI argument for deleting working animation code that took real effort to tune, and what makes it cheap to resurrect if needed?

## extract the Gyarados sprite

- [ ] The extractor found the same 8.85px pitch on both axes but different offsets (x 8.75, y 0), and scored candidates by mean luminance along whole gridlines. Why does scoring entire lines (rather than a single row/column of samples) make the search robust to the chart's heavier every-N gridlines and JPG noise, and what would a half-cell offset error have done to every cell's median?

- [ ] `GYARADOS_BODY`/`GYARADOS_TAIL` are derived at module load from one `GYARADOS_SPRITE` via an `isTailCell` predicate, instead of shipping two hand-split grids. What does the single-source split guarantee when someone later retouches a pixel near the seam, and why is an imprecise cut acceptable HERE when the same sloppiness in `liftFoot`'s foot spans would visibly break the walk?

## exclude Trainer Tool cards

- [ ] The API reports 849 Item cards but the normalized list holds only 368 Item names, and 26 of the 247 Tool names were already present via Item/Stadium. What do those two collapses tell you about what the exclusion actually keys on (printings vs. names), and why is a card like Big Charm — which carries BOTH Item and Pokémon Tool subtypes in different printings — caught either way?

- [ ] The regeneration script lives in the session scratchpad, not the repo, even though the file header says "regenerate when new sets add such trainers" — the third time this list is rebuilt by re-deriving the script from the header. At what point does YAGNI flip and the generator deserve to be checked in under `scripts/`, and what would it need (the normalizeName copy?) to not drift from the route?

## scared hide sequence on click

- [ ] The scare timeline is four `after()` calls scheduled all at once from the click (at 0/1000/1800/2800ms) rather than a chain where each step schedules the next. What does scheduling them up front buy when a second click interrupts mid-episode (think: what the `timers` pool clear guarantees), and where would a chained version have leaked state?

- [ ] The crouch is an inline-style `scaleY(0.7)` on its own div while the tremble is a CSS class replacing the gait class on the layer below. Why can't the crouch and the shake share one element (what happens to `scaleY` the moment `clefairy-shake`'s `translateX` keyframe takes over the transform property), and why does the crouch use `transform-origin: 50% 100%` specifically?

## stepping walk cycle

- [ ] `liftFoot` treats the hip line asymmetrically: below `FEET_TOP` the shift is unconditional (vacated pixels go empty), while above it only non-'.' source pixels overwrite. What would each half of the sprite look like if the other rule were applied to it — i.e. why can't one blit rule serve both regions?

- [ ] The step-frame interval (160ms) lives in a React `setInterval` effect keyed on `walking`, while the bob is a 320ms CSS keyframe — the two are never phase-locked, and the CSS comment only claims they land "roughly" together. Why is an exact 2:1 sync between a JS timer and a CSS animation not actually achievable here, and why does the walk still read fine without it?

## peek sprite: restore the wing under her ear

- [ ] The missing chunk existed because `PEEK_SPRITE`'s face rows were truncated at the arm columns (`...` padding) while the full `SPRITE` keeps the black wing (`k`/`DD` pixels) on that flank — why did the wing clip at the ear line specifically, and what invariant do all rows of a sprite grid have to satisfy for `PixelArt`'s `rows[0].length`-based viewBox to render every row correctly?

- [ ] The fix was verified by extracting the string grids from `Clefairy.tsx` with a scratch script and rendering PNGs, rather than reasoning about the character grid in place. When is building a tiny render-toolchain worth it over reading the "code" directly, and what class of sprite bug (think: the screenshot that triggered this task) can ONLY be caught by looking at pixels?

## phone legend: nudge down

- [ ] The nudge was `pt-2` → `pt-5` on the legend's wrapper in `ComparisonScreen`, not a margin on `StreakLegend` itself. Given the component is also rendered inside `PanelLeft`, why must one-off spacing live on the call site's wrapper, and what would have happened on desktop if the space had been added inside the component?

- [ ] Tailwind's spacing scale made "down a touch" a choice among fixed steps (pt-3/4/5 = 12/16/20px) rather than an arbitrary pixel value (`pt-[13px]` exists but is discouraged). What consistency property does snapping every spacing decision to the shared scale preserve across the app, and when is an arbitrary value genuinely warranted?

- [ ] Restacking the phone legend only touched the wrapper div in `ComparisonScreen` and the `className` passed to `StreakLegend` — no component code changed. What did leaving layout direction to the caller (rather than baking `flex-row`/`flex-col` variants into `StreakLegend` as a prop like `horizontal`) buy in this exact iteration, and where would that "caller owns layout" pattern start to hurt?

- [ ] The horizontal row was chosen initially to save vertical space on phones, and the user rejected it on sight. What does this suggest about which layout decisions are worth shipping as a guess versus asking/mocking first, and why is a cheap-to-reverse guess (one wrapper div) still the right default in this workflow?

- [ ] The "missing" iOS legend was never an iOS bug: `PanelLeft` is `hidden md:flex`, and the phone toolbar had only rescued the Filter trigger from it. Why does verifying this fix via `curl` + grep for both class strings work even though `ComparisonScreen` is a client component — what does Next.js render of a client component on the server, and which kind of hiding (CSS breakpoint vs. conditional render) would that check NOT see?

- [ ] The legend was extracted into `StreakLegend` with layout direction left to the caller's `className`, while the Filter-trigger-plus-badge markup remains duplicated between `PanelLeft` and the toolbar. By the "3+ occurrences" DRY rule both are only at two — what makes extraction the right call for the legend anyway (think: what just went wrong because the two copies COULDN'T drift), and is the same argument true for the badge?

- [ ] The catch-up call in `preloadNext`'s `.finally` had to become `preloadNextInner()` — a named function expression calling itself — because ESLint rejected `preloadNext()` inside its own `useCallback` initializer. Why is the `const` binding not referenceable there while the function's own name is, and why must the in-flight delete happen BEFORE the recursive call for the catch-up to do anything?

- [ ] Before this fix the queue drained ~1 card per 2 rapid picks (skipped top-offs never retried until the next pick), producing a periodic fast-fast-slow rhythm. Why does recomputing `need` at fetch-COMPLETION time (rather than fetch-LAUNCH time) make the refill rate track the consumption rate, and what click pattern can still outrun any finite queue no matter the depth?

## batched challenger queue with image-decode gating

- [ ] `preloadNext` now fires each side's queue top-off as an independent `.then` chain instead of the old `await Promise.all(...)`, and validates on resolve with `preloadRef.current !== store` plus "is the winner still on board" — why did the single `Promise.all` make a click before the *slower* fetch a total miss even when the *relevant* challenger had already arrived, and what does comparing the store by object identity catch that re-computing a key string wouldn't?

- [ ] The overlap fast path now requires `imageReady(challenger.image_url)` (a decoded image), else it degrades to the slide path even with the card data in hand. Why is "queue depth 3 but only WARM_DEPTH 2 images warmed" a defensible split of the prefetching budget, and what changes about the discard economics now that one API call returns `count` challengers instead of one per call?

## warm the optimizer URL, not the raw image URL

- [ ] `warmImage` now mirrors `getImageProps`'s `srcSet`/`sizes` onto the warm-up `Image` instead of just setting `props.src`. Why is copying the srcset (and letting the browser run candidate selection twice) the only way to guarantee a cache hit on a high-DPR display, and which URL would a plain `img.src = props.src` warm there?

- [ ] The cold `/_next/image` request measured ~0.2–0.8s while the warm one was ~2ms, yet the raw pkmncards.com URL we used to warm was itself being cached fine. What general lesson about "warming a cache" does this bug illustrate — what must you verify about the *consumer's* request before a prefetch counts as a prefetch?

## nav right cluster + 1200 in How it works

- [ ] Moving How-it-works/Login to the right only touched flex margins (`ml-auto` moved from the nav to the right cluster, with `md:` variants) because Play/Rankings are absolutely centered on desktop. In the phone layout, which element's `ml-auto` now creates the right-edge grouping, and what would break if BOTH clusters kept `ml-auto`?

- [ ] The modal now hardcodes "1200" while the code reads `DEFAULT_RATING.r`. What's the argument for and against interpolating the constant into the copy, and which failure (stale prose vs. copy coupled to internals) is likelier to be caught in this project's workflow?

## Clefairy tuning + 1200 starting rating

- [ ] The butt-first-descent bug: `xRef`/`yRef` always hold the current walk's TARGET, so a click that interrupts a glide computed its direction from where she was GOING, not where she visually was — fixed by reading `DOMMatrixReadOnly(getComputedStyle(pos).transform)` at the top of `walkTo`. Why does reading the computed transform mid-transition return the interpolated in-flight value rather than the destination the inline style declares?

- [ ] Changing the starting rating to 1200 touched exactly one line because every seed site (both API routes, the dial fallback, the client-side delta calc) imports `DEFAULT_RATING`, while the 1500 anchor inside `toGlickoScale` deliberately stayed. What distinguishes a "single source of truth" constant from an arbitrary-but-shared anchor constant, and why would changing the anchor to 1200 too have been wrong for already-stored ratings?

## nav: centered Play/Rankings, Login placeholder, How-it-works modal

- [ ] In `NavBar.tsx`, Play/Rankings are centered with `md:absolute md:left-1/2 md:-translate-x-1/2` instead of flex spacers, falling back to `ml-auto` (right-aligned) below `md`. Why can't plain flex centering (`justify-center` or twin `flex-1` spacers) give a TRUE center here, and what collision does the phone fallback avoid?

- [ ] `HowItWorks.tsx` explains the ratings as "winner takes points from the loser" even though the code runs Glicko-2, and it deliberately never shows the number 1500. What's the argument for a user-facing explanation lagging the real algorithm's sophistication, and where would that simplification start to mislead users about what they see on the Rankings page?

## Clefairy peeks over cards, walks to clicks

- [ ] In `Clefairy.tsx`, `onClick` listens on the play screen (`areaRef.current.parentElement`) even though the roam layer covers the same box, and it hit-tests her via `spriteBoxRef.getBoundingClientRect()` instead of an onClick on the sprite. What two z-order/pointer-events problems does this pair of choices sidestep that the "obvious" approach (make the sprite clickable) would hit?

- [ ] `peekBehind` never draws the card edge — it pins the peek sprite's bottom at `card.top + 2` and lets the z-10 card occlude everything below its border, so "hands gripping the edge" is faked purely by positioning against a measured DOM rect. What's the tradeoff of composing an effect out of live layout measurements (`cardRects` per act) versus baking the relationship into one owned component, and when does the measured approach break?

## Clefairy roams the whole page

- [ ] In `Clefairy.tsx`, the left-edge wrap teleports her by setting `walkMs` to 0 in the same act as the new `x`, then waits `after(60, …)` before starting the re-entry `walkTo`. Why does the 0ms transition render as an instant jump rather than a fast walk, and what would the user see if the re-entry walk were started in the same tick as the snap?

- [ ] `BACK_SPRITE` was generated by flattening the front sprite's details while keeping the silhouette pixel-identical, so the `scaleX` flip, waddle, hop, and blink layers all work on it untouched. What general principle about swapping an asset "under" a transform stack does this illustrate, and which of those layers would break first if the back view had a different outline?

## responsive iPhone layout (desktop untouched)

- [ ] Every mobile change is a base-value + `md:` pair where the `md:` value restates the old class exactly (e.g. `gap-3 md:gap-8`, `w-[44vw] md:w-[325px]`). Why does this convention make "desktop is unchanged" true by construction rather than by testing, and what's the one way it can still silently break (think: what was the OLD base value before the edit)?

- [ ] Debugging the missing pick-flash: computed style showed `animationName: none` while the source file had the rule, and the served CSS chunk contained pre-session classes only — a stale `.next` Turbopack cache poisoned by git checkouts under a running dev server. What's the general diagnostic ladder this followed (rendered → computed → served → source), and why is each step's mismatch conclusive about where the fault is?

## fix Clefairy's flipped facing

- [ ] The fix negates `facing` at the render (`scaleX(${-facing})`) instead of swapping the `dir` assignment in the wander brain. Why is "state keeps movement semantics, the view layer absorbs the art's native orientation" the more maintainable split — what would a future emote that depends on movement direction look like under each choice?

- [ ] The old hand-drawn sprite was symmetric, so this bug was invisible until the asymmetric extracted sprite landed. What does that say about how orientation conventions should be pinned down (or tested) when an asset is a black box swapped in later?

## Clefairy looks before she walks

- [ ] The look-then-move needed a `facingRef` mirror even though `facing` state already existed. Why does the wander loop's closure (an effect with `[]` deps) always see `facing`'s initial value, and why is a ref the fix rather than adding `facing` to the deps array?

- [ ] The look pause is 150ms when already facing the target but 300-650ms for a turn-around. What principle of believable character motion does scaling anticipation time to the size of the direction change reflect, and where else in this app's animations does an "anticipation beat" already exist?

## glow-only winner flash + Clefairy shrink

- [ ] The flash keyframes changed from a 12% opacity ramp-in to starting at `opacity: 1` at 0%. Given the click also kicks off card slides and a dial spin in the same instant, why does even a ~50ms ramp make a feedback cue feel like it "didn't happen", and what does this say about ordering feedback vs. consequence animations?

- [ ] Clefairy shrinks via `viewBox` + a 0.75 display scale instead of setting `PX = 1.5`. What rendering artifact do fractional rect coordinates risk under `shape-rendering: crispEdges`, and why does scaling the whole vector sidestep it?

## winner flash on every pick

- [ ] The flash is a `key={picks}`-remounted span with a `forwards` one-shot animation, and `pickedId` is now deliberately never cleared mid-swap. Why did the old static `isPicked` shadow show nothing on the overlap paths, and why is it safe for `pickedId` to point at a card that's no longer on the board?

- [ ] The flash animates only `opacity` on a span whose ring/glow is a static `box-shadow`, mirroring the `.flame` approach. What does animating opacity (vs. animating box-shadow itself) buy on the compositor, and when would that shortcut stop being available?

## extract Clefairy from the reference chart

- [ ] The extractor brute-forces the chart's cell size/offset by minimizing mean brightness along candidate gridline positions, then takes each cell's per-channel MEDIAN over its center region. Why median instead of mean here (what do JPG artifacts and gridline bleed do to each), and why sample only the center 40% of the cell?

- [ ] Background removal flood-fills 'W' cells from the image border instead of mapping all white to transparent. What feature of this specific sprite (look at rows 14, 18, 36-38) would plain white-keying have destroyed, and what's the general name/idea of this inside/outside distinction?

## pixel-art Clefairy sprite

- [ ] The sprite is a string map rendered as one SVG `<rect>` per pixel with `shapeRendering="crispEdges"`, and `BLINK_SPRITE` is derived by rewriting four columns in the two eye rows. What breaks silently if a future sprite edit shifts the eyes off rows 10–11, and how could the blink transform locate the eyes robustly instead?

- [ ] The sprite was authored by generating the silhouette geometrically (ellipse + triangles + auto-outline pass) and then eyeballing PNG renders, rather than hand-typing the grid. When is "build a tiny toolchain to see your output" worth it over editing blind, and what did the auto-outline pass guarantee that hand-pixeling kept getting wrong?

## Clefairy wanderer

- [ ] `Clefairy` stacks five nested divs (positioner → facing flip → pick hop → wander emote → waddle/bob), each owning one transform. Which pairs would visibly break if merged onto one element, and why does the pick hop need a layer separate from the wander emote specifically?

- [ ] The wander brain is one self-rescheduling `setTimeout` chain with `xRef` mirroring the `x` state. Why can't the loop read `x` directly (what would the `[]`-deps closure see), and what alternative designs (setInterval tick, useReducer machine, rAF loop) were rejected and at what cost/benefit?

## kill the blank beat on preload misses

- [ ] `swapLoserForFresh` now waits `Math.max(0, SLIDE_MS - (performance.now() - slideStart))` instead of a fixed `SLIDE_MS` after the fetch. Draw the two timelines (fetch faster vs. slower than the slide) — in each, when does the challenger start rising, and why was the old code's blank always `fetch + SLIDE_MS`?

- [ ] The preload effect dropped `ready` from its condition, firing at swap START. Why does this NOT re-preload for the outgoing pair at pick time (think: which dependency actually changes and when), and what does this trade against showing the user a slightly staler challenger choice?

## parallelize the comparison API's Supabase round trips

- [ ] In `/api/comparison/next`, the count, `fetchAllRanks`, and the history query now share one `Promise.all`, but `sampleEligible` still waits for the count. Supabase query builders are lazy thenables — what actually starts each request, and why does `fetchAllRanks` paginating with `.order("card_id")` matter for pages not overlapping?

- [ ] The POST's upsert+insert were serialized, implying an ordering guarantee that never existed (PostgREST has no cross-table transaction). What failure states were possible before vs. after parallelizing, and what's the general lesson about sequential `await`s implying dependencies to readers?

## add the Critter mascot

- [ ] `Critter` replays its hop by putting `key={picks}` on the hop wrapper rather than toggling the `critter-hop` class on and off. Why doesn't removing-then-re-adding a class restart a finished CSS animation within the same frame, and what does the remount give you that `animation-iteration-count` can't?

- [ ] The hop and the idle bob animate `transform` on two nested divs instead of one. Relate this to the existing `RankingCard` wiggle/flip question in this file: what is the general rule for when two CSS animations need separate elements?

## overlap the pair swap with Keep Winner off

- [ ] `overlapFresh` only runs when the preloaded pair shares no `card_id` with the outgoing pair (`disjoint`), falling back to the sequential slide otherwise. Walk through what `pos` (a `Record<card_id, Position>`) would have to hold if one card appeared in both pairs — which of the two motions wins, and what would the user see?

- [ ] `exiting` went from `Exit | null` to `Exit[]` so one mechanism covers both the single-loser overlay and the whole-pair overlay. When is generalizing a state shape like this justified versus adding a parallel second state (`exitingPair`), and how does YAGNI cut in this specific case?

## replace ELO floats with Rating dials

- [ ] `RatingDial` reads its animation start from `shownRef` instead of the `shown` state inside the `useEffect`. Why would depending on `shown` directly break the tween loop, and what does mounting the exit overlay's dial with `from` solve that keying by `card_id` alone can't?

- [ ] `handlePick` now folds BOTH cards' new ratings into `cards` state at pick time, which let `overlapSwap`/`swapLoserForFresh` drop their winner-fold and every `clearFloat` guard. What general principle about "derive UI from one source of state vs. imperatively triggering effects" does this illustrate, and which stale-float bug class disappeared for free?

## flip card over in `See Rankings`

- [ ] In `RankingCard`, the flip's `rotateY` is on the inner `[transform-style:preserve-3d]` div while `.wiggle` (a `rotate`) is on the outer button — what visually breaks if you instead put both on the same element, and why does `preserve-3d` make that collision worse than for a 2D-only card?

- [ ] The back face uses `[transform:rotateY(180deg)]` *and* `[backface-visibility:hidden]`. Why are both needed — what would you see mid-flip (and when fully flipped) if you dropped the `backface-visibility` on the two faces?

## move `Play` information to sidebar

- [ ] `ComparisonArea` receives `flameColor` from `@/lib/streak` rather than a `flame` prop from `ComparisonScreen`. What decided which streak logic became a shared module versus which stayed as passed-down state (`streak`, `streakCardId`)?

- [ ] Now that `ComparisonScreen` passes ~11 props into `ComparisonArea`, what's the tradeoff of this "lift all state, dumb child" split versus letting `ComparisonArea` own some of that state itself — and which future ticket (e.g. arrow-key picks, persistence) would break if the child owned `cards`?

## fix card spacing

- [ ] `ComparisonArea`'s container keeps `pb-40` and adds `my-8`. Why keep `pb-40` (what animation depends on that bottom room) instead of replacing it with symmetric margin, and how does `flex-1` interact with the added `my-8`?

- [ ] The wiggle hint arms its 6s timer only in `onMouseEnter` and never re-arms while hovering. What class of "annoying repeated animation" bug does the *don't re-arm* choice prevent, and why is clearing the timer in `onMouseLeave` (plus the unmount cleanup) required for the "leave and return re-triggers" behavior to work correctly?

## split sidebar into `PanelLeft` / `PanelRight`

- [ ] `PanelLeft` and `PanelRight` are `w-56 shrink-0` siblings of the `flex-1` `ComparisonArea`. Why does making the panels `shrink-0` (and the area `flex-1`) keep the two cards visually centered, and what happens to the centering if `ComparisonArea` had a fixed width instead?

- [ ] We deleted `PlayInfoPanel` and split its contents into two edge columns rather than keeping one panel. Given the goal was "don't affect the comparison area's y-margin," why does flanking the area with side columns satisfy that better than a single top toolbar or one-sided sidebar would?

## add `collector_number` to the rankings card back

- [ ] Adding `collector_number` to the rankings response only required editing the `cards!inner(...)` select string and the `RankedCard` type — why did the `...row.cards` spread in `route.ts` mean the mapping code needed no change, and what would break if a selected column had no matching field on `RankedCard`?

- [ ] The `details` array wraps `collector_number` in `orDash` just like the other nullable fields. What's the design benefit of routing every display value through one null-normalizing helper versus letting each row decide its own fallback, and when would that uniformity become a constraint?
## rebuild Rayquaza's arm with an elbow bend

- [ ] `buildarm.py` splits the photo arm into a thinned tube and a fist, rotates them 52° and 20° below horizontal, and overlaps the forearm 15px back along its own axis before compositing it ON TOP of the upper arm. Why does the overlap have to run along the forearm's axis (not just shift left), and why did the trace need 18 colors instead of 16 to keep the claws white?

- [ ] The arm is composited UNDER the body tube in `graft6.py`, so the shoulder is hidden and the limb "emerges" from the silhouette. What general rule about grafting parts onto a sprite does this illustrate — when is hiding a joint behind an occluder better than trying to blend a visible seam?

## on-screen loop U-turn, opposite-side entry, gap from departure

- [ ] In `serpentVisit`, `scheduleVisit()` moved from the episode-end timers into the despawn callbacks (`setSerpent(null)`). Why does scheduling the next visit from the fixed `after(swoopMs + 900)` timer measure the gap from a slightly different moment than the serpent actually leaving, and where does that drift come from?

- [ ] The swoop's `turn` waypoints make the Catmull-Rom path cross itself into a teardrop loop, and the sprite's facing flips automatically mid-loop because `flyNext` derives `dir` from each segment's dx sign. What's the advantage of deriving orientation from the path over scripting a flip at a known time, and when would the dx-sign heuristic misfire?

## guard the peek sink-back against the episode ending mid-peek

- [ ] `nervousPeek`'s rise is guarded by `episodeRef.current`, but the bug lived in the sink-back closure 1.45s later. Why did clobbering `walkMs` to 300 mid-walk read as a "teleport" — what does the CSS transition do when its duration property shrinks while the transform target also changes?

- [ ] Clefairy's motion multiplexes ONE transform through shared `x`/`y`/`walkMs` state, so any late timer can hijack an in-flight glide. What's the general lesson about one-shot timers that mutate shared animation state, and how does checking an "owner" flag (`episodeRef`) at fire time differ from clearing the timer at handoff?

## hide-spot sanity: reject mid-swap card rects, clamp her into the walkable box

- [ ] The teleport was traced to `hideSpotBehind` receiving a card rect whose `bottom` was ~470px below the floor line — a `[data-compare-card]` element measured mid-remount after a pick. Why does `getBoundingClientRect` on a card that React is in the middle of swapping report a position "flowed" to the bottom of the document, and why did no amount of transition/timer analysis reproduce it until the harness started clicking cards?

- [ ] The fix layers a rect filter (in `cardRects`) AND a coordinate clamp (in `hideSpotBehind`/`nervousPeek`). What's the argument for enforcing an invariant ("she never leaves the walkable box") at the point of use even when the data source is already filtered — and what's the equivalent principle in API design?

## layout-true card rects, fresh peek measures, nearest step-out, motion-driven feet

- [ ] `cardRects` now builds each card's box from `offsetLeft/offsetTop/offsetWidth/offsetHeight` against the wrapper instead of `getBoundingClientRect`. Which two CSS transforms on the card button were contaminating the old measurement, and why does offset geometry ignore them by definition?

- [ ] Her stepping feet now key off a `moving` state sampled from the animating transform rather than a `walking` flag set by the same timers that drive the walk. What's the general principle about deriving UI state from observed reality versus mirroring it in bookkeeping flags, and what did each of the two reported feet glitches (frozen mid-run, stepping in place) reveal about flag drift?

## board is off-limits outside serpent visits: roam rects + coverage watchdog

- [ ] Roaming clearance now uses `roamRects()` (card slot extended to the wrapper's bottom, covering the rating dial) while hides/peeks keep the card box from `cardRects()`. Why do these two consumers genuinely need different geometry, and what would break if hides used the dial-extended box?

- [ ] The coverage watchdog polls her held spot against the board every 900ms, but during any walk her refs hold the TARGET rather than her live position. How does that ref convention make the watchdog naturally idempotent (an escape in flight reads as clear), and when would polling her live computed position instead cause repeated pool-clears?

## one-sweep Rayquaza on the drawn arc; flee only once the serpent is visible

- [ ] The swoop's waypoints are now body-CENTER coordinates mapped to the sprite anchor with `x - dim.w / 2`. Why did anchoring the mirrored x directly make right-side entries spawn a whole body-length off-screen while left entries spawned 24px off, and what property of the scaleX facing-flip explains the asymmetry?

- [ ] Clefairy's flee is scheduled for when the serpent's head is ~140px on screen plus a 300ms beat, computed from each behavior's speed rather than observed from the DOM. What are the trade-offs of deriving "when will it be visible" from the motion model versus polling the serpent's live position, and when would the model-based timing go stale?

## clean-slate mount: hot reloads can strand mid-visit state

- [ ] The effect now resets `episodeRef`, the serpent, and `peeking` on mount. Which pieces of a mid-visit snapshot does Fast Refresh preserve versus destroy (state, refs, pending timers), and why does that exact split produce a frozen serpent plus a permanently-true `episodeRef`?

- [ ] The one-pass regression report couldn't be reproduced: logged flight waypoints were strictly monotonic across every visit. What's the value of asserting an invariant ("x never reverses") over the actual runtime trace before touching code, and how does a stale client bundle masquerade as a code bug during live-edited dev sessions?

## one shared lane: both serpents cross under the Rankings

- [ ] The crossing height is now solved from measured geometry (`lowest + 6 + dim.stripH`, clamped to 0) instead of the old CROSS_HEIGHT fraction. Walk through why the serpent positioner being BOTTOM-anchored makes the naive "y = dial bottom + margin" land the sprite a full body-height too high, and how the video frame check caught what the coordinate logs looked fine on.

- [ ] Unifying Rayquaza onto Gyarados' straight crossing deleted the whole prowl branch, the Catmull-Rom helper, and the per-segment flight chain. What's the maintenance argument for deleting a behavior "mode" rather than leaving it switchable, and what signals in this session justified YAGNI here?

## distance-scaled flee: she always makes it behind the card

- [ ] The flee speed is now `Math.max(WALK_SPEED * 5, dist / 2.2)` instead of a fixed 5x dash. Why did a constant px/s flee interact badly with the serpent's constant-DURATION crossing (11.9s regardless of screen width), and what invariant does expressing the flee as a time budget restore?

- [ ] `dist` is computed from `xRef/yRef`, which mid-walk hold her TARGET rather than her live position (walkTo re-reads the live transform internally). When is this approximation safe here, and what would it take for the discrepancy to matter?

## she hides behind the card that just won

- [ ] The winner reaches Clefairy via a `data-compare-winner` attribute on the card button rather than a React prop. What are the trade-offs of communicating through DOM attributes here versus threading `pickedId` down as a prop, given that Clefairy already measures these elements with `querySelectorAll`?

- [ ] `pickedId` is deliberately never cleared after a pick, and with Keep Winner off the winner departs the board. Trace why `cards.find((c) => c.winner) ?? nearest` handles all three regimes (no picks yet, Keep Winner on, Keep Winner off) without any mode flag.

## serpents enter on Clefairy's side

- [ ] Flipping the entry side was a one-character change (`herOnRight ? -1 : 1`) because side selection was already derived from her measured position at visit start rather than stored in an alternation ref. What does this say about deriving parameters from live state versus accumulating them in mutable refs?

- [ ] With the serpent now surfacing on her side, the flee usually sends her TOWARD the incoming head (the winner card is often mid-screen). Which existing mechanisms (notice delay, distance-scaled flee, z-layering) keep that close encounter reading as a chase rather than a collision?

## minimum-ELO filter knob

- [ ] The ELO knob is enforced inside `sampleEligible` via `rankByCardId` (hoisted above the sampling loop) instead of in the DB count/rows queries the way price is. Why can't this filter be pushed into the `cards` query, and what keeps the 409/retry path honest even though `maxOffset` comes from a count that ignores the ELO filter?

- [ ] Setting the knob above 1200 hides every card the player hasn't rated yet, because unrated cards count as `DEFAULT_RATING`. What makes a filter keyed on the player's own past picks self-reinforcing ("rich get richer"), and how does it interact with the explore/exploit policy in `supply_winner_with_fresh_card`, whose unseen pool it can empty?
