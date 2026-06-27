# CODE

## DATABASE

- [ ] (**collector numbers**) Add Collector Numbers to the Pokemon database.

## FUNCTIONAL

- [ ] (**Add `See Rankings` page**) 
	- Vertically scrollable page that displays all the cards the player has ranked so far 
	- Higher ranked cards at the top. 
	- Cards a middle-centered
	- Next to the cards are their ordinal rank
	- Bottom of the screen contains rank meter ("You've compared x out of y cards (abc%)!`)


- [ ] (**shuffle cards on load**) When we first load in the `cards`, make sure that we shuffle the order so that each player gets a unique set of comparisons.

- [ ] (**`Keep Winner` toggle on `Play` page**) 
	- *GOAL*:
		- Add a toggle called `Keep Winner` to te `Play` page (place where user compare the cards)
		- If the toggle is switched, then when they user selects a winner card, only the loser card gets swapped out.
		- The next card to come in should be either:
			- A comparison that hasn't happened yet, or if that's not possible
			- The most information rich comparison (similar r, higher RD)
	- *STEPS*:
		- Add a UI update on the `Play` page to present the `Keep Winner` toggle
		- Update `comparison/next/route.ts` to make the inner workings more modular.
			- Original logic -> `information_rich_pair() --> Pair[Card, Card]`
				- Add documentation to better describe the code that's already in there.
			- Additional logic with toggle --> `supply_winner_with_fresh_card() --> Card`
				- This logic should be somewhere that makes sense. We'll also need to make the function in `comparison/next/route.ts` read the `winner_id` variable, otherwise it won't know which card is the "winner"

- [ ] (**background**) Set the background of the site to `white`.

- [ ] (**nav bar**) A navigation bar that rests atop every screen. `PokeMash` logo on the left (`public/pokemash_logo.png`). In the `middle`, but more to the right, are the `Play` and `See Rankings` buttons. THere is a shadow underneath the navbar to make it look like it's resting atop the screen. Those buttons grow and turn red when they are hover over. When they are clicked. Make sure that those `button` commponents / styles are somewhere that makes them easy to reuse again later in the project


# LEARNING

- [ ] How are the `player_id` in comparison populated? Where is the code getting that information from, and if the same person leaves the site and come back, how do we know to use the same `player_id`?

- [ ] Does having the `public SELECT` RLS policy on `pokemon-cards` (Supabase table) put my database at risk of being DDOSed?

- [ ] What is `page.tsx` doing?

- [ ] What does the Glicko-2 `tau` constant control, and why does a smaller value make a player/card's volatility more resistant to sudden swings?

- [ ] In `glicko2.ts`, why do ratings get converted to the "Glicko-2 scale" (mu/phi/sigma) instead of computing directly on the 1500-centered `r`/`RD` numbers?

- [ ] Why does this comparison engine pick the card with the highest `RD` first, then pair it with the closest `r`, instead of just picking two random cards?

- [ ] The `card_ranks` and `comparisons` RLS policies here allow any anonymous request to insert/update rows for *any* `player_id` — what's the actual risk of that (e.g. someone tampering with another player's rankings), and what would closing it require (auth, signed requests, a server-only service-role key)?

- [ ] Why is `player_id` a plain client-generated UUID in `localStorage` rather than a Supabase Auth user id at this stage, and what has to happen to "migrate" that anonymous id into a real account later?

- [ ] In `route.ts` (`/api/comparison`), why is the rating update for the winner and loser computed from *each other's pre-update rating* rather than updating one and then using the new value for the other?

- [ ] What would break if two browser tabs for the same `playerId` submitted two different comparisons at nearly the same time (a race condition on the `card_ranks` upsert)?
