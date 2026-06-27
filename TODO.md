# CODE

## DATABASE

- [ ] (**collector numbers**) Add Collector Numbers to the Pokemon database.

- [ ] (**add `year` column to `cards` table**)

## FUNCTIONAL

- [ ] (**compare from `See Rankings`**) Add abilitity to click on card from `See Rankings` to compare that card on `Play` to another card.

- [ ] (**load more cards**) Currently, we're only loading in ~100 cards from the database, rather than all of them.

	- [ ] (**`lazy` card polling**) When making a comparison, rather than pulling all the cards at once or batches, we should just lazily pull the cards so that we only load into the database the cards that we need.

- [ ] (**consistent card comparison**) 
	- *DESC*:
		- Once a pair for comparison loads onto the page, it shouldn't disappear if the user leaves the page and comes back.
	- *ARCH*:
		- `current_pair: tuple[card_id, card_id]`, stored in `ComparisonScreen.tsx`.
		- How is this value used?

- [ ] (**Add skip button**) At the bottom of the screen below the cards, add `Skip` button if the user doesn't want to compare the cards.

- [ ] (**price reveal after selection**) After a user selects a card, before the two cards disappear, display their prices below them.

- [ ] (**averaged hover color**) When hovering over a card during `Play`, the hover color should be the *average pixel color* of that card.
	- *ARCH*:
		- Add `average_pixel_color(Card) -> RGB` function

- [ ] (**add filters to comparison pool**) On left side of the `Play` screen, add filters for `Price` (min: int, nax: int), `Pack` (str), `Set` (str), `Year` (checkbox: str), and `Name` (str). Then, only the cards that satisfy those filters will be part of the `comparison pool`.
	- *ARCH*:
		- `comparison_pool: list[Card]`
		- `Filter Component`
			- `int` (min / max)
			- `str` (search box / checkbox, similar to the search on TraceIQ)

- [ ] (**add `dark mode` toggle**)

- [ ] (**pre-loaded future comparisons**)
	- *PROBLEM*: Card selection takes too long
	- *SOLUTION*: Quicken card selection process by preloading the possible future cards so that when the player makes a comparison, the next card(s) to load-in is already present in memory.

- [ ] (**"hard-choice tracker**) A "hard-choice" is one that takes more than `n` second. We should have a panel to see wha those are.

- [ ] (**decide usign arrow keys**) Pick a winner by tapping the left or right arrow keys.

## STRUCTURAL

- (**add `Card` object**) Add a `Card` object to easisly interface with and store the data of a card.