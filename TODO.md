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