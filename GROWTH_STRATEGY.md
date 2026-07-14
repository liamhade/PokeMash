# CardMash Growth Strategy

*A deployable, organic-first plan to drive real active-user traction. Written July 2026,
timed to the Pokémon TCG market peak and the Mega Evolution set cadence.*

---

## Market timing (why now)

The TCG is at an all-time high. The market has roughly 10x'd since 2020, restocks are causing
in-store fights, and new sets are landing on a ~6–8 week cadence:

- **Mega Evolution: Pitch Black** — July 17, 2026 (Mega Darkrai ex chase).
- **Storm Emeralda / Mega Rayquaza ex** — early autumn 2026, expected biggest card of the year.

Every set release is a recurring content + search-interest spike to ride.

**Our unique moat:** nobody else has *desirability* data. TCGplayer has prices, PSA has grading
pop — only we have an ELO taste ranking crossed with market price ("the most underrated card in
Evolving Skies"). The whole plan monetizes that.

---

## Three hard realities the plan is built around

1. **Infra dies at ~1–2k good sessions/month.** Supabase free tier ≈ 70k card-image loads;
   one front-page Reddit post is 10–50k visitors/day. Fix infra *before* marketing or the viral
   moment 402s and is wasted.
2. **Best launch channels are one-shot.** r/InternetIsBeautiful, Show HN, Product Hunt, "I made
   this" TCG posts — one credible launch each. Don't fire them before the share loop exists.
3. **You cannot buy this audience.** Paid ads on Pokémon IP risk trademark flags + TPCi
   attention, and affiliate economics don't support ad spend. This is a 100% organic plan — the
   product itself carries distribution.

---

## Phase 0 — Make the site launch-ready (~2 weeks eng). Do not post anywhere until these exist.

1. **Survive traffic (~1 day).** Cloudflare (free) in front of the app on `cardmash.io`; proxy +
   cache the `card-art` bucket (immutable WebP, cache-everything) so art stops burning Supabase
   egress. Upgrade Supabase Pro ($25/mo) + Vercel Pro ($20/mo — affiliate links make the site
   commercial, which Hobby disallows). Load-test `/api/comparison/next`.
2. **The share loop (~3–4 days) — highest leverage feature.** A "My Top 8" share image
   (`@vercel/og` grid of the user's top cards + wordmark + URL), one-tap from Rankings. Every
   piece of social content downstream depends on this. Add OG meta tags site-wide so pasted
   links unfurl with card art.
3. **The linkable artifact (~2–3 days).** A public global leaderboard — "The Internet's Top 100
   Pokémon Cards" — aggregating ELO across all players. This is what journalists/Redditors/
   YouTubers link to (personal rankings are private, so today no URL demonstrates the product
   without playing). Seed to ~50 players / a few thousand comparisons before launch.
4. **Measurement (~half a day).** Plausible ($9/mo) or Vercel Analytics with 4 events: first
   comparison, 20th comparison (hook), sign-in, share-image created. Tag every launch link with
   `?ref=` (hn, reddit-tcg, riib, ph, tiktok).
5. **Catalog freshness (recurring).** Import Pitch Black on July 17 via the DEVELOPMENT.md
   new-set runbook. "Rank the new set the day it drops" is a recurring marketing beat.

**Total cash cost of this entire plan: ~$55/mo + domain.**

---

## Phase 1 — Launch salvos (weeks 3–5, one per week, in order)

Space them a week apart to fix what breaks and reuse what you learn.
Expected if two of four land: **20–60k visitors, 1–3k signed-in users.**

1. **r/PokemonTCG (~1M+) + r/pkmntcgcollections.** "I built a site that figures out which cards
   you actually like — pick between two, it learns your taste. No account needed." Lead with a
   juicy matchup screenshot (Base Zard vs Moonbreon) + your top-8 image; answer every comment
   for 24h. Read each sub's self-promo rules (spend the build weeks genuinely participating).
   Post Thu–Fri of **Pitch Black release week**; first comment: "yes, Pitch Black is in there."
2. **r/InternetIsBeautiful (~17M).** Built for delightful single-purpose no-signup sites.
   "A site that learns your favorite Pokémon cards by making you choose, then ranks all ~6,700."
3. **Show HN.** "Show HN: FaceMash for Pokémon cards – ELO rankings from 1M head-to-head picks."
   Tell the *engineering* story (ELO/Glicko choices, eligibility-pool curation, price-verification
   rabbit hole — DONE.md is full of it). Weekday morning ET. Low hobby conversion but reaches
   builders, bloggers, collaborators.
4. **Product Hunt.** Lowest EV; a morning, not more. Do last, reuse polished assets.

---

## Phase 2 — The content engine (months 2–4). ~4 hrs/week.

**One weekly data story from your own DB, published in three formats.**

Stories (rotate, all queryable today):
- "The internet's top 10 cards this week" (+ movers)
- **"Most underrated cards"** — high ELO, low price. Killer format: it's a *buying tip*
  (collectors share buying tips) with your TCGplayer affiliate link right under it.
- "Most overrated" — sub-$5 desirability at $500 prices (engagement bait)
- Set-release specials: "10,000 picks in: the community's ranking of Pitch Black" one week after
  each drop. **Have "the internet ranks every Rayquaza ever printed" ready for Storm Emeralda.**
- "Vintage vs modern: what actually wins head-to-heads"

Three formats per story:
1. **Reddit** native image post in TCG subs (link in comments — image posts >> link posts).
2. **TikTok/Shorts/Reels (~60s)** — screen-record matchups + reveal countdown. Expect 2–3 months
   of grind before one pops; when it does it's worth 10 Reddit posts.
3. **X/Twitter thread** into the TCG/investing conversation (very active during the boom).

**Creator outreach — highest-leverage single channel.** Skip megastars. Target 10k–100k-sub TCG
YouTubers/TikTokers (dozens, answer DMs, starved for concepts). Pitch a *format*: "Rank 20 iconic
cards blind on my site, react to the internet's ranking, dunk or agree." Give each a `?ref=`
link + a "Creator vs the internet" page. One mid-tier video ≈ 5–20k targeted visitors. 5
personalized pitches/week, ~10% hit rate.

**Community seeding:** be a regular (not a spammer) in big TCG Discords + PokeBeach; drop the
site only where organically relevant.

---

## Phase 3 — Durable channels (month 3+, compounding)

**Programmatic SEO — the long-term traffic annuity.** ~23k cards with names, sets, prices, and
(uniquely) desirability ranks → static pages: `/rankings/[set]` ("Best cards in Evolving Skies,
ranked by 40,000 head-to-head picks") and eventually `/card/[id]` pages. Hundreds of set pages,
thousands of card pages targeting long-tail queries that spike every set release. The
unique-content problem (Google's usual objection to programmatic pages) is solved by your ranking
data. Every page has a "Rank these yourself" CTA. Near-zero for 2–3 months, then your largest
steady channel by month 6.

**Retention (turn visitors into active users).**
- **Daily Mash:** same 10 matchups for everyone daily, streak counter, shareable result — the
  Wordle loop (daily return + free social distribution).
- **Taste-match score** on the friends feature: "Your taste is 73% similar to Liam's." A number
  to argue about makes people recruit friends — friend codes become a growth loop.

**Monetization check:** finish TCGplayer affiliate approval (code slot already built in
`tcgplayerUrl`) + eBay Partner Network on existing eBay buttons. Realistic bar: cover the
~$55/mo burn so the operation self-sustains.

---

## Targets & kill criteria

| Milestone | When | Signal |
|---|---|---|
| Launch spike | Month 1 | 20–60k visits; ≥25% reach 20 comparisons |
| Baseline | Month 3 | 300–1,000 DAU; one repeatable channel identified |
| Compounding | Month 6 | 2–5k DAU; SEO ≥30% of traffic; ≥5% of sessions from shared links |

Watch **comparisons/session** (target 30+ — inherently sticky if fast, which the preload work
ensured) and **anonymous→sign-in conversion** at the 20-comparison prompt. If a salvo lands but
D1 return is <10%, **stop marketing and fix retention first** — pouring traffic into a leaky
funnel is the standard indie-launch death.

**What not to do:** paid ads (IP risk, negative ROI); all salvos in one week (server risk, no
learning); a Discord before ~1k DAU (empty Discord reads as dead product); any feature that
clutters the two-cards-one-click loop — the minimalism *is* the viral property.

**This week, concretely:** Cloudflare + domain + analytics (1 day), share-image endpoint (3 days),
global leaderboard page (2 days), import Pitch Black on the 17th, start genuinely participating in
r/PokemonTCG so the account has history before Salvo 1 (~July 24).

---

## Sources

- [CNBC — Pokémon card boom (2026)](https://www.cnbc.com/2026/05/22/pokemon-cards-crypto-market-resale-logan-paul.html)
- [Pokémon.com — July 2026 TCG releases](https://www.pokemon.com/us/news/check-out-every-pokemon-tcg-product-release-in-july-2026)
- [Dexerto — 2026 release calendar](https://www.dexerto.com/pokemon/pokemon-tcg-release-2629243/)
- [GempireCards — 2026 calendar (Storm Emeralda / Mega Rayquaza)](https://www.gempirecards.com/news/pokemon-tcg-release-calendar-2026)
- [Omega Gaming — scalping / demand](https://www.omegagaming.world/pokemon-tcg-scalping-problem-is-spiraling-beyond-just-reselling/)
- [Accio — 2026 market analysis](https://www.accio.com/business/pokemon-card-market-trend-analysis-2026)
