# CODE

## FUNCTIONAL

- [ ] (**consolidate components**) combine panelRight and panelLeft into the comparison screen, since that's the only place that we would need the information.

- [ ] (**anon->sign-up**) The user gets 20 free comparisons (that number should be easily adjustable in the backend code). After that, the user is prompted with a sign-in modal in the center of the screen (the rest of the screen should be blurred). All sign-in functionalities should leverage `Supabases` built-in sign-in functionalites. The user should be prompted to sign-in with their Google account (OAuth, which Supabase natively supports). After a user signs-in, the comparisons / rankings that they performed while anonymous should automatically transfer over to their current account.

	- [ ] (**account handling**) A red `Sign Up` Pill button will be created in the upper right in the `Nav Bar`. When the user clicks it, the same modal that pops-up in the **anon->sign-up** ticket should appear. The user should be prompted to sign-in with their Google Account (OAuth). Once the user signs in, a person icon appears in the upper-right. If they click on the person icon, it shows a dropdown modal that contains their email address that they are signed in with, as well as a sign-out button.

- [ ] (**pre-loaded future comparisons**)
	- *PROBLEM*: Card selection takes too long.
	- *SOLUTION*: Quicken card selection process by preloading the possible future cards so that when the player makes a comparison, the next card(s) to load-in is already present in memory. This function must work for both selections of the `Keep Winner` toggle.

- [ ] (**move comparison pool rule into the database**)
	- *PROBLEM*: The rarity rule above lives in TypeScript because the app's read-only key can't create DB objects. That means an extra `cards` read per request and logic split from the data.
	- *SOLUTION*: Apply `supabase/migrations/20260630_comparison_pool.sql` (creates `comparison_pool()`), then switch `/api/comparison/next` back to `supabase.rpc("comparison_pool")`. Needs someone with Supabase DB access.

- [ ] (**add `supertype` / `subtypes` columns to `cards`**)
	- *PROBLEM*: Three pool filters are fragile name/regex hacks because the data has no card-type info: energy detection (`isEnergyCard` name regex), Item/Stadium exclusion (the 573-name `itemStadiumNames.ts` list, which goes stale with new sets), and the GX/V/ex "buzzword" mechanic detection (`FEATURED_MECHANIC` regex).
	- *SOLUTION*: Add `supertype` (Pokémon | Trainer | Energy) and `subtypes` (e.g. Item/Stadium/Supporter for Trainers; V/VMAX/ex/GX/… for Pokémon) columns, backfilled from the Pokémon TCG API (match by set + collector number, fall back to name). Then replace: energy filter → `supertype = 'Energy'`; Item/Stadium → `supertype='Trainer' AND subtypes && '{Item,Stadium}'`; buzzword keep → `subtypes` contains a mechanic tag. NOTE: "full art" is NOT a type — it stays in `rarity` (Ultra/Illustration/Special Illustration/etc.), so the rarity rules are unaffected. Needs Supabase DB write access + a one-time backfill job.

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