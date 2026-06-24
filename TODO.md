# CODE

## MAINTAINABILITY

- [x] Add documentation to files in `api` so that I can understand what's going on.

- [ ] Add `TODO-update` skill to Claude that implements the TODO items, using explicit documentation, and updates the learning section accordingly with conceptual questions to help foster understanding of the changes.

## FUNCTIONALITY

- [x] Home screen should be the comparison screen

	- [x] Remove pokemon-cards table from Subapase and homescreen.

- [x] When cards disappear above screen after the winner is clicked, they should not be seen flying back down the screen after. They should only be seen flying upwards, disappearing above the screen.

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
