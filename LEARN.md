
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

- [ ] The `set-state-in-effect` lint fired on `loadNextPair()` even though that
  function only calls `setState` after `await fetch`. Why can't the lint rule see
  that the state updates are no longer synchronous, and what about an `await`
  boundary makes the "cascading render" concern not apply?

- [ ] Suppressing a lint rule with a targeted `eslint-disable-next-line` + comment
  vs. restructuring the code to satisfy it: what's the risk of each, and what made
  the disable the honest choice here rather than hiding a real bug?

- [ ] In `next/route.ts`, why is the `Common/Uncommon/No Rarity/Double Rare`
  exclusion done in the SQL `not in` filter, but the plain-`Rare` era rule done in
  JS via `isEligible`? What property of `release_date` forces that split, and what
  would break if I tried to express `year < 2023` directly in the PostgREST query?

- [ ] The route does a `count` query and then a `range(offset, offset + 1000)` at a
  random offset instead of just selecting the first 1000 eligible cards. What
  problem with PostgREST's row cap does the random window solve, and how does this
  compare to the `order by random() limit` the SQL function version would use?

- [ ] `isEnergyCard` strips `{symbols}` and "Prism Star" and then tests `/\bEnergy$/i`
  rather than just checking `name.includes("Energy")`. Walk through why "Energy
  Retrieval" and "Beast Energy Prism Star" each need that anchoring to be classified
  correctly — what goes wrong with a plain substring match?

- [ ] Energy removal is done in JS (`isEligible`) while the boring rarities are
  excluded in the SQL query. Given energy cards can carry *kept* rarities (e.g.
  "Spiky Energy" is Hyper Rare), why couldn't the existing `not in (...)` rarity
  filter have removed them, and what does that tell you about when a filter belongs
  in the query vs. in code?

- [ ] Geist was imported and wired to `--font-sans`, yet the site rendered in Arial.
  What in `globals.css` overrode it, and why does a `body { font-family: ... }` rule
  win over the Tailwind `--font-sans` theme variable?

- [ ] `Source_Code_Pro` is imported from `next/font/google` rather than via a
  `<link>` to Google Fonts or a raw `@font-face`. What does next/font do at build
  time (self-hosting, the generated `--font-source-code-pro` variable, the
  "Fallback" font) and what problems — layout shift, privacy, an extra request — does
  that solve?

- [ ] Removing the Skip button also meant deleting `handleSkip`. Which user-facing
  capability disappeared with it (hint: the `outcome: "draw"` POST), and what would
  I need to re-add — UI and request — to bring draws back later?

- [ ] After deleting the button I also removed the `PillButton` import but left the
  `PillButton.tsx` file in the repo (like `FilterButton`). Why does an unused import
  cause a lint error while an unused *file* doesn't, and what does that imply about
  how the linter and the bundler each decide what's "dead"?

- [ ] Promos are filtered by `isFeaturedPromo` (name mechanic) while every other card
  is filtered by `rarity`. Why does the single shared "Promo" rarity force a
  name-based rule, and what kind of promo does this approach wrongly drop that the
  rarity-based rule would have kept for a non-promo (hint: a holo of a plain Pokemon)?

- [ ] `PROMO_MECHANIC` is anchored with `$` and uses `\b` before each token (e.g.
  `\bV$`). Walk through why "Pikachu VMAX" is NOT matched by the `\bV$` alternative
  but IS matched by `\bVMAX$`, and why the trailing `$` is what prevents a stray "V"
  in the middle of a name from counting.

- [ ] `isVintage` compares full dates (`new Date(releaseDate) < MODERN_ERA_START`)
  instead of `year < 2011`. Given HeartGold & SoulSilver ends 2011-02-09 and Black &
  White starts 2011-03-09, what specific card would a year-only cutoff misclassify,
  and why does the boundary landing inside one calendar year force date comparison?

- [ ] We concluded dropping non-buzzword `Rare` "never drops a full art" from two
  facts: Reshiram 113/114 is stored as `Ultra Rare`, and 0 of 2601 `Rare` cards have
  secret-style numbering (numerator > denominator). Why is that pair of observations
  stronger evidence than either alone, and what single counterexample would break it?

- [ ] `Rare` and `Rare Holo` were unified into `VINTAGE_ELIGIBLE_RARITIES` (a Set)
  rather than two `if` branches. What made a Set the right structure here, and at what
  point (how many such rarities) does that beat chained `||` comparisons for clarity?

- [ ] Both a 1999 Base Set Charizard and a 2018 Scizor are stored as `Rare Holo`, yet
  one is a chase card and the other a plain foil. Since the rarity value is identical,
  what single field distinguishes them in our rule — and why is that more reliable
  here than, say, trying to read "holo-ness" or art type from the data?

- [ ] The floating "+X" uses two nested spans: an outer that's `-translate-x-1/2
  -translate-y-1/2` and an inner with the `elo-float` animation. Why can't the
  centering and the drift live on the *same* element — what does a CSS `transform`
  keyframe do to a Tailwind `-translate` class on that element?

- [ ] The rating delta is computed in the `/api/comparison` POST and sent back to the
  client, rather than recomputed in `ComparisonScreen` with `glicko2.ts`. What bug
  would client-side recomputation risk here, and how does this reflect "single source
  of truth" for the rating math?

- [ ] `randomFloat` sets a `key` on the inner span. In Keep Winner mode the winning
  card keeps the same `card_id` across rounds — what would the animation do on a
  repeat win if that `key` stayed constant, and why does changing it fix it?
