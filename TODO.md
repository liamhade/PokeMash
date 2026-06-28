# CODE

## FUNCTIONAL


- [ ] (**Add skip button**) At the bottom of the screen below the cards, add `Skip` button if the user doesn't want to compare the cards.

- [ ] (**decide usign arrow keys**) Pick a winner by tapping the left or right arrow keys.


- [ ] (**pre-loaded future comparisons**)
	- *PROBLEM*: Card selection takes too long
	- *SOLUTION*: Quicken card selection process by preloading the possible future cards so that when the player makes a comparison, the next card(s) to load-in is already present in memory.

- [x] (**add filters to comparison pool**) On left side of the `Play` screen, on the same level as the `Keep Winner` toggle, add a `Filter` button. Support the ability to filter by field names from the database. To start, only implement filtering on `cards.rarity`. When the user clicks the `Filter` button, a modal should popup that includes a search box titled `Rarity` above it. When the user clicks on the search box, the different values for `cards.rarity` column populate a scrollable dropdown menu. When the user types into the search box, only those values that contain the inputed string (when both are brought to lowercase) remain. There is a checkbox next to each of the values. When the user selects one of those values, it stays highlighted, and a small box with the name of the applied filter pops up next to the search box. In the code, this area will be called the `applied_filter area`. In this modal, there are three options to exit. First, the user can click the `Apply` button, which applies the filters and ensures that the next set of cards meets the filter criteria (that will required updating the `comparison/next` GET function). Next, there will be an `x` in the upper right corner that, when clicked, exits out without applying the filters. Or, the user can click anywhere outside of the modal, and the modal will close without applying filters (same function as hitting `x`).

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


## STRUCTURAL

- (**add `Card` object**) Add a `Card` object to easisly interface with and store the data of a card.

# LEARNING

- [ ] In `ComparisonScreen.tsx`, why is `rarityQuery` wrapped in `useCallback`
  reading `selectedRaritiesRef.current` instead of just closing over the
  `selectedRarities` state directly — what breaks in `loadNextPair` if it
  depended on the state value instead of the ref?

- [ ] In `next/route.ts`, the keep-winner branch now fetches the winner card
  separately when it's missing from the rarity-filtered pool. What category of
  bug would a naive `.in("rarity", rarities)` filter introduce here if we
  *didn't* special-case the held winner, and why does the fresh challenger not
  need the same treatment?