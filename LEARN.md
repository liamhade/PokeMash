
# LEARNING

- [ ] Can I add regular `classNames` in Tailwind CSS?

- [ ] How are the `player_id` in `comparison` populated? Where is the code getting that information from, and if the same person leaves the site and come back, how do we know to use the same `player_id`?

- [ ] Does having the `public SELECT` RLS policy on `pokemon-cards` (Supabase table) put my database at risk of being DDOSed?

- [ ] What is `page.tsx` doing?

- [ ] What does the Glicko-2 `tau` constant control, and why does a smaller value make a player/card's volatility more resistant to sudden swings?

- [ ] In `glicko2.ts`, why do ratings get converted to the "Glicko-2 scale" (mu/phi/sigma) instead of computing directly on the 1500-centered `r`/`RD` numbers?

- [ ] Why does this comparison engine pick the card with the highest `RD` first, then pair it with the closest `r`, instead of just picking two random cards?

- [ ] The `card_ranks` and `comparisons` RLS policies here allow any anonymous request to insert/update rows for *any* `player_id` — what's the actual risk of that (e.g. someone tampering with another player's rankings), and what would closing it require (auth, signed requests, a server-only service-role key)?

- [ ] Why is `player_id` a plain client-generated UUID in `localStorage` rather than a Supabase Auth user id at this stage, and what has to happen to "migrate" that anonymous id into a real account later?

- [ ] In `route.ts` (`/api/comparison`), why is the rating update for the winner and loser computed from *each other's pre-update rating* rather than updating one and then using the new value for the other?

- [ ] What would break if two browser tabs for the same `playerId` submitted two different comparisons at nearly the same time (a race condition on the `card_ranks` upsert)?

- [ ] In `globals.css`, what did deleting the `@media (prefers-color-scheme: dark)` block change for a visitor whose OS is set to dark mode, and where else in the app is "white" still being asserted (e.g. `bg-white` on `body` and the screen containers)?

- [ ] The page background now comes only from the `--background` variable on `body` (the redundant `bg-white` on `<body>` was removed). Why does the `NavBar` still need its own `bg-white` even though it sits on a white page — what does `sticky` + a shadow require?

- [ ] In `NavButton.tsx`, why does it render a Next `Link` rather than a `<button>` wired to `router.push`, and what does `Link` give us (prefetch, normal anchor semantics) that the button wouldn't?

- [ ] Why does mounting `<NavBar />` once in `layout.tsx` make it "rest atop every screen," and what re-render does that avoid compared to importing it into each `page.tsx`?

- [ ] In `next/route.ts`, the `shuffle` runs *before* `information_rich_pair`. Given every unrated card shares `rd = 350`, trace what the first served pair would be for two different players if the shuffle were removed.

- [ ] Fisher-Yates produces a uniform permutation in O(n). What's actually wrong with the tempting `cards.sort(() => Math.random() - 0.5)` one-liner that we deliberately didn't use?

- [ ] In `rankings/route.ts`, why is the total fetched with `{ count: "exact", head: true }` instead of selecting all `cards` rows and reading `.length` — what does `head: true` skip transferring?

- [ ] The rankings page is a `"use client"` component that calls `getPlayerId()` then fetches `/api/rankings`. Why can't it be a server component that queries Supabase directly the way the route does?

- [ ] In `ComparisonScreen.tsx`, why must `handlePick` `await` the POST to `/api/comparison` *before* calling `swapLoserForFresh`, and what repeated-matchup bug appears if that POST is fired without awaiting?

- [ ] In `next/route.ts`, `supply_winner_with_fresh_card` prefers a card with no prior comparison to the winner and only then sorts by `Math.abs(x.r - winner.r) || y.rd - x.rd`. Why is an *unseen* opponent more informative than re-pitting the winner against a closely-rated card it has already beaten?

- [ ] In `ComparisonScreen.tsx`, why is `keepWinner` mirrored into `keepWinnerRef` (synced in a `useEffect`) and read as `keepWinnerRef.current` inside `handlePick`, rather than just reading the `keepWinner` state variable directly?

- [ ] In `ComparisonScreen.tsx`, why is `rarityQuery` wrapped in `useCallback`
  reading `selectedRaritiesRef.current` instead of just closing over the
  `selectedRarities` state directly — what breaks in `loadNextPair` if it
  depended on the state value instead of the ref?

- [ ] In `rankings/route.ts`, why does filtering by rarity require
  `cards!inner(...)` plus `.in("cards.rarity", rarities)` rather than a plain
  `cards(...)` embed — what would the query return for a ranked card whose rarity
  doesn't match if the join stayed a left/outer one?

- [ ] `RarityFilterModal.tsx` was moved into `src/components/` and is now
  consumed by both `ComparisonScreen` and `rankings/page`. Why does keeping the
  modal stateless about *what* gets filtered (it only emits a `string[]` via
  `onApply`) let the same component drive two different fetches — and what would
  couple it to one screen if it called the API itself?

- [ ] In `ComparisonScreen.tsx`, the new arrow-key `useEffect` has *no*
  dependency array, so it re-subscribes the `keydown` listener every render. Why
  is that needed for `handlePick(cards[0])` to fire against the *current* pair,
  and what stale-pair bug would an empty `[]` deps array reintroduce?

- [ ] The Filter button was split into two components: `PillButton` (generic
  style) and `FilterButton` (Filter-specific). Why is that two-layer split better
  than one combined component — what can each layer change independently, and how
  does adding the "Too Hard / Skip" button as another `PillButton` justify the
  generic layer existing?

- [ ] In `NavBar.tsx`, the `NavButton` link still points at `href="/rankings"`
  even though its visible text changed from "See Rankings" to "Rankings" — why is
  the route path independent of the button label, and what would break if I'd
  "fixed" the route to match the new wording?

- [ ] Renaming a UI label is a one-word change, yet `DONE.md`/`TODO.md` still call
  this screen "See Rankings". What's the tradeoff between updating every reference
  to a feature's name versus letting spec docs drift from the live UI text?

- [ ] In `ComparisonScreen.tsx`, why does writing `gap-8 lg:gap-24` (rather than
  replacing `gap-8` with `gap-24`) leave the iPhone layout untouched — what does
  Tailwind's mobile-first breakpoint model do when no `lg:` rule applies?

- [ ] I picked the `lg:` (1024px) breakpoint to mean "computer". What would I have
  to check about iPad and large-phone logical widths to be confident this rule
  never triggers on a device the user considers a "phone"?

- [ ] After deleting the filter feature, `loadNextPair`'s dependency array became
  `[]` instead of `[rarityQuery]`. Why was `rarityQuery` a dependency before, and
  what stale-closure bug would I risk if I'd left a real changing value out of that
  array instead of removing it entirely?

- [ ] I left `FilterButton.tsx`, `RarityFilterModal.tsx`, and `/api/filters/rarity`
  in the repo even though nothing imports them now. When is keeping
  soon-to-return dead code the right call versus deleting it and trusting git
  history to bring it back?
