
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

- [ ] The float was moved out of the sliding `<button>` into a `relative` wrapper
  `<div>`. Since the button slides via a CSS `transform`, why does the wrapper keep
  occupying the card's original box — and why was that the fix for the number riding
  off-screen with the card instead of staying in the white margin?

- [ ] The `elo-float` keyframe holds opacity 1 from 25% to 60% before fading, rather
  than fading continuously. Given the losing card slides away ~500ms after the pick
  and the animation runs 1300ms, why does the hold-then-fade shape satisfy "don't
  fade until the card disappears" without any JS coordinating the two timings?

- [ ] The stale `-Y` bug worsened from "sometimes" to "every time" over a session.
  Explain how each loser leaking a `floats` entry (its wrapper unmounts before
  `onAnimationEnd`) turns into an *accumulating* set, and why that makes a returning
  card progressively more likely to collide with a leftover entry.

- [ ] The first fix attempt was a `setTimeout(clearFloat, 1300)` in `showFloat`; the
  real fix clears floats deterministically on board changes (`loadNextPair` resets,
  swap clears loser+incoming). Why is "clean up when the board changes" more reliable
  than "clean up after a duration" for state tied to which cards are on screen?

- [ ] Bitcount Ink is loaded as a second `next/font/google` with its own `--font-elo`
  variable and applied only to the float span, while the site stays on Source Code
  Pro. Why scope a font with a CSS variable on one element instead of swapping the
  global `--font-sans`, and what does the "Skipping generating a fallback font"
  warning tell you about size-adjust fallbacks for a pixel font?

- [ ] In `supply_winner_with_fresh_card`, the challenger is chosen by
  `Math.abs(x.r - winner.r)` (nearest rating) among cards the winner hasn't faced.
  Reason about why that, plus Keep Winner holding the same card, makes a player see a
  recurring cluster of similar-rated cards — and what `comparedOpponentIds` being the
  *winner's* history (not global) fails to prevent.

- [ ] Item/Stadium cards are excluded by matching `normalizeName(row.name)` against a
  name list generated with the *same* normalization. Why must the generation-time and
  runtime normalizations be identical, and what failure mode (false negatives) appears
  if one side, say, keeps apostrophes while the other strips them?

- [ ] We pulled Item/Stadium names from the Pokémon TCG API into a static file rather
  than adding a `subtype` column to Supabase. What does the static-list approach trade
  away (think new sets, accuracy, who can edit it) versus a real subtype column, and
  why was it still the right call given the read-only key and no DB access right now?

- [ ] Swapping Bitcount Ink for Pixelify Sans only meant changing the `next/font/google`
  import + call in `layout.tsx`, with no edit to `ComparisonScreen`. What indirection
  made the float component immune to the font change, and how does `--font-elo` enable
  that?

- [ ] The site uses two fonts (Source Code Pro globally, Pixelify Sans for ELO floats),
  each its own `next/font` call. What's the cost of adding a third font this way, and
  when does "one variable per font, applied where needed" beat a single global font?

- [ ] "Coral Pixels" was first misread as a coral *color* and then corrected to a
  *font*. Looking at the diff, which file did each interpretation touch
  (`ComparisonScreen.tsx` className vs `layout.tsx` import) — and what does that say
  about where "font" vs "color" decisions live in this codebase?

- [ ] Coral Pixels is a COLR/CPAL color font, so `text-green-500` does nothing to it.
  How does `@font-palette-values` + `font-palette` recolor it instead, and why did we
  have to override all 32 CPAL entries rather than just index 0?

- [ ] Recoloring forced us OFF `next/font` and onto a hand-written `@font-face`. What
  property of `next/font`'s generated family name makes it incompatible with
  `@font-palette-values { font-family: ... }`, and what did self-hosting cost us that
  next/font gave for free?

- [ ] Switching to Bitcount Prop Single let us delete the @font-face, both
  @font-palette-values, the self-hosted .ttf, and the inline `fontPalette` — back to
  one `next/font` line + `text-green-500`/`text-red-500`. What single property of the
  font made all that machinery unnecessary, and what cheap check (which table?) would
  have flagged the Coral Pixels detour up front?

- [ ] In `supply_winner_with_fresh_card`, `band` uses `.slice(0, SOFT_BAND_SIZE)` and
  then a random index. Why does this stay correct when `choices.length < 30`, and what
  would break if we instead indexed `band[Math.floor(Math.random()*30)]` directly?

- [ ] The new selection is epsilon-greedy (random card 30% of the time) wrapped around
  a soft band (random of the 30 nearest). What does each layer buy that the other
  doesn't — i.e. why not just one of them — and how does raising `EXPLORE_EPSILON`
  toward 1 turn this into the planned "Prioritize New Cards" behavior?

- [ ] Bumping the `<Image>` to 325×450 grew the card, but `randomFloat` still uses a
  188px minimum outward distance against what was a ~130px half-width — now ~162px.
  Does the float still clear the card edge, and at what card size would the number
  start landing back on the art?

- [ ] Next's `<Image width/height>` sets both the intrinsic size and (absent CSS
  overrides) the rendered size. Why does changing these two numbers resize the card on
  screen here, and when would you instead control display size with CSS and leave
  width/height as the source aspect ratio?

- [ ] The streak needs both `streak` (count) and `streakCardId` (which card it belongs
  to). Walk through what would break with only a count: when the held winner finally
  loses and the challenger takes over, how does comparing `winner.card_id ===
  streakCardId` reset the flame correctly?

- [ ] The flame is a separate absolutely-positioned `<span class="flame">` rather than
  a class on the `<button>`. Given the button already sets `box-shadow` for hover and
  picked states, why does a dedicated element avoid a conflict — and why does the
  flame's box-shadow still appear *around* the card despite the span being `inset-0`?

- [ ] The realistic flame is a `box-shadow` ruffled by an SVG `feTurbulence` +
  `feDisplacementMap` filter. What does each filter primitive contribute (noise vs.
  pixel-pushing), and why does animating `feTurbulence`'s `baseFrequency` make the
  flames *move* rather than just sit there distorted?

- [ ] We reached for a CSS/SVG filter instead of a flame image/GIF/Lottie. What does
  the pure-CSS approach win (scales to any card size, recolorable via `--flame-color`,
  no asset) and what does it risk (cross-browser filter quirks, "is it convincing?"),
  and when would a real asset be the better call?

- [ ] A `.flame-tongue` is a square-ish div with `border-radius: 0 50% 50% 50%` rotated
  by `var(--rot)` (`edge + 45°`). Why does that border-radius make a teardrop, and why
  is the `+45°` needed to aim the point outward for an `edge` of 0/90/180/270?

- [ ] The tongues' flicker animates only `opacity`, while the wiggle comes from the SVG
  filter — not from an animated `transform`. Given each tongue already uses `transform`
  for its `translate(...) rotate(...)` placement, why would animating `transform` for
  the flicker have broken the layout (recall the earlier float-centering bug)?

- [ ] The reworked flame splits motion across two keyframe sets: `flame-rise` animates
  the individual `scale` property and `flame-sway` animates `rotate`, both on
  `.flame-tongue-svg`. What would happen if I'd instead written both as `transform:`
  keyframes (e.g. `transform: scaleY(...)` and `transform: rotate(...)`) running at
  once — and why do the *individual* `scale`/`rotate` properties compose where two
  `transform` animations don't?

- [ ] The `FLAME_OUTER_PATH`/`FLAME_INNER_PATH` flame shape starts at `M5 60`, never
  returns to that bottom-left point until the closing `Z`, and tapers to a single point
  at `y=0`. Contrast that with the first broken version (`M12 56 ... 12 56 Z`, a point at
  both ends): why does a *wide base + single tip* read as fire while a *two-tip* shape
  reads as a leaf, and what role does the `mask: linear-gradient(to top, ...)` tip-fade
  play on top of the shape?

- [ ] The redesigned flame keeps its `filter: blur(1.4px)` STATIC and only animates
  `transform`/`opacity` on `.flame-tongue-svg`. Walk through why a transform animation
  over a statically-blurred, `will-change`-promoted layer is GPU-cheap, whereas the
  earlier version's `drop-shadow` on the `.flame` *container* (whose children animated)
  forced an expensive per-frame re-render — what does the compositor reuse in the first
  case that it can't in the second?

- [ ] Per-tier color is now a baked `<linearGradient>` chosen by `gradId` from a shared
  hidden `<defs>`, instead of filling each path with `rgb(var(--flame-color))`. Given a
  CSS custom property set on `.flame` *does* cascade to a descendant `<stop>`, why is the
  three-fixed-gradients approach still the better call here — think about duplicate
  gradient `id`s across 19 tongues and what `fill="url(#id)"` resolves to.

- [ ] After every flame-tongue design was rejected we deleted all of it for a `z-0`
  `.flame` layer behind the card: a solid `background` fill + a two-layer `box-shadow` halo,
  with only `opacity` pulsing (`flame-pulse`). The streak state (`streak`/`streakCardId`)
  and `flameColor()` survived every rewrite while the entire render/CSS layer was thrown
  away each time. What does that stability of the *logic* vs. churn of the *presentation*
  suggest about where to draw the seam between them, and why was each visual rewrite cheap
  because of it?

- [ ] The glow is a `.flame` span at `inset: -3px` (a hair larger than the card) sitting
  behind it (`z-0`), not a `box-shadow` on the `<button>`/`<Image>` itself. Given the button
  already toggles its own `shadow-[...]` for hover/picked states, what conflict does the
  separate layer avoid, and why does the `-3px` overhang plus the solid `background` fill
  read as a glowing border *around* the opaque card stacked on top of it?

- [ ] The streak legend `<ul>` uses `top-1/4` paired with `-translate-y-1/2` to land 75% up
  the card area. Why does "75% up" map to `top: 25%`, and what role does `-translate-y-1/2`
  play that `top-1/4` alone wouldn't — i.e. what point of the list is actually being pinned
  to that line?

- [ ] The legend is positioned `absolute` inside the `ComparisonScreen` root div rather than
  relative to the viewport or the whole page. Why does that make "75% up the card area,
  excluding the nav banner" fall out automatically, and what would break if the legend were
  positioned `fixed` instead?

- [ ] Restoring the saved pair is done in a mount `useEffect` rather than a `useState` lazy
  initializer that reads `sessionStorage` during render. Given `ComparisonScreen` is a
  client component that Next.js still server-renders for the initial HTML, what hydration
  problem does the effect avoid that the lazy initializer would introduce?

- [ ] The save effect guards on `cards && ready` before calling `writeSavedComparison`.
  Trace what would get persisted (and then restored on the next visit) if it saved on every
  `cards` change instead — think about the `null`/`"below"` states `loadNextPair` and
  `swapLoserForFresh` pass through mid-animation.

- [ ] `next/route.ts` now de-dupes the eligible pool into `eligibleById` (a `Map` keyed by
  `card_id`). Given `information_rich_pair` and `supply_winner_with_fresh_card` already
  filter out the first/winner card by id, what *additional* self-match scenario does the
  pool-level dedup actually close that those per-pair filters don't?

- [ ] The dedup keeps the FIRST row seen for each `card_id` (`!eligibleById.has(...)`) rather
  than the last. Since the rows come from a `.range()` window over the `cards` table, why is
  "first vs last wins" a safe thing not to worry about here — and when would that choice
  start to matter?

- [ ] The logo's darker outline is four stacked `drop-shadow(...)` filters (N/S/E/W) rather
  than `box-shadow` or an SVG `stroke`. Why does `drop-shadow` produce an outline that hugs
  the logo's shape while `box-shadow` would only draw a rectangle around the `<img>` box?

- [ ] We faked the bolder outline with a CSS filter instead of redrawing the PNG (still
  tracked under TODO: make logo dark). What are the tradeoffs of the filter approach — think
  about scaling/retina sharpness, the 1px offsets at different DPRs, and why this is a
  stopgap rather than the real fix.

- [ ] In `next/route.ts`, series and price filters are pushed into the Supabase query but
  era is filtered two ways: a DB `set IN (...)` pre-filter (`eraSets`) AND a JS year check
  (`matchesEras`). Why is the DB pre-filter alone insufficient for a series like Promos, and
  why is the JS check alone insufficient given the contiguous `.range()` sampling?

- [ ] `ERA_SETS` lists a series under an era only where it has *substantial* volume, omitting
  boundary grazes (HGSS's 2011 tail, Sword & Shield's 2019 set). What goes wrong with the
  resample success rate if a mostly-modern series like Sword & Shield is included in the
  `middle` list, and how does that interact with `SAMPLE_RETRIES`?

- [ ] The empty-window problem is handled by resampling with a fresh random offset up to
  `SAMPLE_RETRIES` times, and the loop `break`s early when `maxOffset === 0`. Why is
  retrying pointless in that case, and what determines whether `maxOffset` is 0 for a given
  filter combination?

- [ ] `applyFilters` sets `filtersRef.current = next` synchronously *and* calls `setFilters`,
  even though a `useEffect` already syncs the ref to state. Why is the synchronous ref write
  necessary for the `loadNextPair()` call on the next line to fetch with the new filters,
  given `loadNextPair` is a `useCallback([])` that closes over `filtersRef`?

- [ ] The series dropdown reads from a static `SERIES` array in `FilterModal` instead of an
  API call, while the old rarity filter fetched `distinct_rarities()` via an RPC. What
  pushed this toward a hardcoded list, and what's the maintenance hazard that the
  `keep in sync with the API's ERA_SETS` comment is guarding against?
