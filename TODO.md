# CODE

## FUNCTIONAL

- [ ] (**pre-loaded future comparisons**)
	- *PROBLEM*: Card selection takes too long.
	- *SOLUTION*: Quicken card selection process by preloading the possible future cards so that when the player makes a comparison, the next card(s) to load-in is already present in memory. This function must work for both selections of the `Keep Winner` toggle.

- [ ] (**increase new card novetly**) Currently, the comparison function often compares the same cards over and over again, rather than pulling new cards from the database. There should be a

- [ ] (**compare from `See Rankings`**) Add abilitity to click on card from `See Rankings` to compare that card on `Play` to another card.

- [ ] (**flip card over in `See Rankings`**) Ability to flip over a card and see the details there.

- [ ] (**consistent card comparison**) 
	- *DESC*:
		- Once a pair for comparison loads onto the page, it shouldn't disappear if the user leaves the page and comes back.
	- *ARCH*:
		- `current_pair: tuple[card_id, card_id]`, stored in `ComparisonScreen.tsx`.
		- How is this value used?

- [ ] (**price reveal after selection**) After a user selects a card, before the two cards disappear, display their prices below them.

- [ ] (**averaged hover color**) When hovering over a card during `Play`, the hover color should be the *average pixel color* of that card.
	- *ARCH*:
		- Add `average_pixel_color(Card) -> RGB` function

- [ ] (**add `dark mode` toggle**)

- [ ] (**"hard-choice tracker**) A "hard-choice" is one that takes more than `n` second. We should have a panel to see wha those are.
