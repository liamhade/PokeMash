# CODE

## DATABASE

- [ ] (**collector numbers**) Add Collector Numbers to the Pokemon database.

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

- [ ] (**update hover color**)

## STRUCTURAL

- (**add `Card` object**) Add a `Card` object to easisly interface with and store the data of a card.