# CODE

## FUNCTIONAL

- [ ] (**pre-loaded future comparisons**)
	- *PROBLEM*: Card selection takes too long.
	- *SOLUTION*: Quicken card selection process by preloading the possible future cards so that when the player makes a comparison, the next card(s) to load-in is already present in memory. This function must work for both selections of the `Keep Winner` toggle.

- [x] (**rarity-restricted comparison pool**) — DONE (in app code; see DONE.md). Follow-up below to move it into the DB.
	- *PROBLEM*: Comparing common/uncommon cards is boring, so the comparison pool should exclude them — but "interesting" means different things per era.
	- *SOLUTION (as built)*: `/api/comparison/next` now drops `Common`/`Uncommon`/`No Rarity`/`Double Rare` (the modern ex, not full art), keeps plain `Rare` only for vintage sets (release year < `VINTAGE_CUTOFF_YEAR` = 2023), and keeps everything else (all holo/ex/GX/V/Illustration/Ultra/Secret/Promo/Trainer Gallery/Mega rarities). Net effect: vintage = rares + promo; modern = full-arts only.
	- *NOTE*: This superseded the old manual rarity `Filter` button (removed earlier; `FilterButton`/`RarityFilterModal`/`api/filters/rarity` kept in repo + git history for possible reintroduction).

- [ ] (**move comparison pool rule into the database**)
	- *PROBLEM*: The rarity rule above lives in TypeScript because the app's read-only key can't create DB objects. That means an extra `cards` read per request and logic split from the data.
	- *SOLUTION*: Apply `supabase/migrations/20260630_comparison_pool.sql` (creates `comparison_pool()`), then switch `/api/comparison/next` back to `supabase.rpc("comparison_pool")`. Needs someone with Supabase DB access.

- [ ] (**increase new card novetly**) 
	- *PROBLEM*: Card comparisons don't feel new enough. Currently, the comparison function often compares the same cards over and over again, rather than pulling new cards from the database. 
	- *SOLUTION*: There should be a toggle called `Prioritize New Cards` that makes sure that whatever card we fetch is a card that we haven't already seen. If we've already seen every card, then we choose the maximally information rich pairing, just as we do now.

<!-- Flesh this out more -->
- [ ] (**compare from `See Rankings`**) Add abilitity to click on card from `See Rankings` to compare that card on `Play` to another card.

<!-- Flesh this out more -->
- [ ] (**flip card over in `See Rankings`**) Ability to flip over a card and see the details there.

<!-- Flesh this out more -->
- [ ] (**consistent card comparison**) Once a pair for comparison loads onto the page, it shouldn't disappear if the user leaves the page and comes back.

<!-- Flesh out -->
- [ ] (**price reveal after selection**) After a user selects a card, before the two cards disappear, display their prices below them.

- [ ] (**averaged hover color**) When hovering over a card during `Play`, the hover color should be the *average pixel color* of that card.
	- *ARCH*:
		- Add `average_pixel_color(Card) -> RGB` function

- [ ] (**make logo dark**) Background of `PokeMash` logo is light, but it shoul de dark. We'll need to upgrade the `.png` to fix this.

<!-- Flesh out -->
- [ ] (**add `dark mode` toggle**) Pokemon themed `Moon` and `Sun` toggle?
