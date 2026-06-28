# CODE

## FUNCTIONAL

- [ ] (**move the `filter` button to a component**) Current, editing the style of the `Filter` button means that we have to make a change in two places. That's sloppy code. Move that filter button to `components` so that we only have to change the button in one place. Also, define a `style` so that if ever want to make another button that looks like the `Filter` button, it's as simple as reusing that filter button template. Don't the the filter button template `filterTemplate` or anything like that -- it should be more generic. 

- [ ] (**Add skip button**) At the bottom of the screen below the cards, add `Too Hard / Ship` button if the user doesn't want to compare the cards. This will result in a draw between the cards.

- [ ] (**decide usign arrow keys**) Pick a winner by tapping the left or right arrow keys if the user is on a computer.

- [ ] (**pre-loaded future comparisons**)
	- *PROBLEM*: Card selection takes too long
	- *SOLUTION*: Quicken card selection process by preloading the possible future cards so that when the player makes a comparison, the next card(s) to load-in is already present in memory.

- [ ] (**load more cards**) Currently, we're only loading in ~100 cards from the database, rather than all of them. 

- [ ] (**`lazy` card polling**) When making a comparison, rather than pulling all the cards at once or batches, we should just lazily pull the cards so that we only load into the database the cards that we need.

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
