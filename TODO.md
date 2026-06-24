# FUNCTIONALITY

- [x] Display Supabase information on website

- [x] Add comparison functionality

	- [x] Frontend

		- [x] Logic

			- [x] Glicko-2 ELO algorithm (r, RD, and mu values for each card) to calculate the ELO for a player for a card. These values are stored in the `card_ranks` table, and update on each comparison

			- [x] UI selects the card that has the highest `RD`, and the card that has the closest `r` value to it as the current pair for comparison. This way, we gain maximum information for each comparison.

		- [x] UX
			
			- [x] Comparison Lifecycle

				- [x] (1) Start of comparison starts with blank screen

				- [x] (2) Two cards emerge from the bottom of the screen

				- [x] (3) During comparisons, the cards are displayed side-by-side on the screen.

				- [x] (4) Hovering over a card makes it look bigger, and causes to it glow.

				- [x] (5) Clicking a card causes that card to briefly glow green around the edge.

				- [x] (6) Cards shoot up off the screen, and Supabase gets updated.

	- [x] Supabase

		- [x] Create relational tables:

			- [x] cards:
				- card_id: UUID (primary key)
				- name: str
				- year: int
				- price: float
				- image_url: float

			- [x] card_ranks:
				- player_id: UUID
				- card_id: UUID
				- r: float (ELO score)
				- RD: float (Rating Deviation)
				- mu: float (volatility)
				- last_updated: timestamp

			- [x] comparisons:
				- Player_id: UUID
				- winner_card: UUID
				- loser_card: UUID
				- timestamp: timestamp


# LEARNING

- [ ] Does having the `public SELECT` RLS policy on `pokemon-cards` (Supabase table) put my database at risk of being DDOSed?

- [ ] What is `page.tsx` doing?

- [ ] What does the Glicko-2 `tau` constant control, and why does a smaller value make a player/card's volatility more resistant to sudden swings?

- [ ] In `glicko2.ts`, why do ratings get converted to the "Glicko-2 scale" (mu/phi/sigma) instead of computing directly on the 1500-centered `r`/`RD` numbers?

- [ ] Why does this comparison engine pick the card with the highest `RD` first, then pair it with the closest `r`, instead of just picking two random cards?

- [ ] The `card_ranks` and `comparisons` RLS policies here allow any anonymous request to insert/update rows for *any* `player_id` — what's the actual risk of that (e.g. someone tampering with another player's rankings), and what would closing it require (auth, signed requests, a server-only service-role key)?

- [ ] Why is `player_id` a plain client-generated UUID in `localStorage` rather than a Supabase Auth user id at this stage, and what has to happen to "migrate" that anonymous id into a real account later?

- [ ] In `route.ts` (`/api/comparison`), why is the rating update for the winner and loser computed from *each other's pre-update rating* rather than updating one and then using the new value for the other?

- [ ] What would break if two browser tabs for the same `playerId` submitted two different comparisons at nearly the same time (a race condition on the `card_ranks` upsert)?
