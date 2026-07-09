# Development Guide

How to run PokeMash locally and how we organize our work. (Product spec lives in
`README.md`; this file is purely about the *workflow*.)

## Running the app locally (live reload)

PokeMash is a **Next.js 16** app. The dev server watches your files and hot-reloads
the browser on every save, so you see changes in real time.

1. **Install dependencies** (only needed once, or after `package.json` changes):

   ```bash
   npm install
   ```

2. **Create `.env.local`** in the project root (already scaffolded — gitignored, so
   it never gets committed). It needs two values:

   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://wmhbvlggntwisedrvncq.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your anon/publishable key>
   ```

   - The URL comes from the Supabase project ref in `.mcp.json`.
   - The publishable key: Supabase dashboard → Project Settings → API → "anon /
     public" key (or ask your collaborator for the value they use).
   - Without the key, the homepage still loads but Supabase-backed pages
     (`/rankings`, `/compare`) will fail.

3. **Start the dev server:**

   ```bash
   npm run dev
   ```

   Open **http://localhost:3000**. Edit a file, save, and the page updates
   automatically. Stop the server with `Ctrl+C`.

Other scripts: `npm run build` (production build), `npm run start` (serve the
production build), `npm run lint` (ESLint).

## Google sign-in (Supabase Auth) — one-time dashboard setup

The sign-in flow is pure Supabase Auth (no extra env vars — the publishable key
covers it), but it only works once the project is configured in the dashboard:

1. **Google credentials:** in Google Cloud Console, create an OAuth 2.0 Client ID
   (type "Web application") with the authorized redirect URI
   `https://wmhbvlggntwisedrvncq.supabase.co/auth/v1/callback`.
2. **Enable the provider:** Supabase dashboard → Authentication → Sign In / Providers
   → Google → paste the client ID + secret.
3. **Allow our redirect targets:** Authentication → URL Configuration → set the
   Site URL to the production domain and add `http://localhost:3000/**` (and the
   prod domain's `/**`) to Redirect URLs — `signInWithOAuth` sends users back to
   `{origin}/auth/callback`, which must be on this allowlist.

Until step 2 is done, "Continue with Google" bounces off Supabase with a
"provider is not enabled" error; everything else in the app still works.

## Branch & commit workflow

We collaborate on `main`, so **all of my work happens on a separate branch** to avoid
interfering with my collaborator.

- **A new branch per task** (branched off `main`), created when the task is assigned.
- **One commit per change or subtask.** If several edits all serve the same subtask,
  they go in a single commit; unrelated changes get their own commits. This keeps
  history easy to read and easy to revert.
- **Commit messages** describe *what* changed and *why*, in the imperative mood
  (e.g. `Add dark-mode toggle to navbar`).
- Code follows our SE principles: small, readable, well-commented changes (YAGNI,
  DRY, single responsibility).

## Adding new sets (catalog maintenance)

Card eligibility and card art are both **preprocessed**, not computed per request:
`cards.eligible` is stamped from the rules in `src/lib/comparisonPool.ts`, and art is
pre-resized WebP in the `card-art` storage bucket (`cards.art_url`). Our schema has no
supertype/subtype columns — energy and Item/Stadium/Tool trainers are excluded by
NAME (the static list in `src/lib/excludedTrainerNames.ts` stands in for a subtype
column). So after importing new card rows into `cards`, walk this list:

1. **Regenerate the trainer exclusion list** if the new sets add Item/Stadium/Tool
   trainers: query the Pokémon TCG API (`supertype:Trainer subtypes:Item|Stadium|
   Pokémon Tool`) and rebuild `src/lib/excludedTrainerNames.ts` — its normalization
   must keep matching `normalizeName` in `comparisonPool.ts` (see the file header).

2. **Extend the static series lists** if a brand-new `set` value appears:
   `SERIES` in `src/components/FilterModal.tsx` (the filter options) and
   `ERA_SETS` in `src/app/api/comparison/next/route.ts` (era sampling windows).

   Also **review any new full-art promos** into `FULL_ART_PROMO_NUMBERS` in
   `src/lib/comparisonPool.ts` (keyed by pack + collector number). Modern Black
   Star Promos (SWSH/SVP/MEP and successors) file full-art and plain framed
   promos both as bare `Promo`, and no data field distinguishes them — so a
   full-art promo without a mechanic in its name only becomes eligible once its
   number is in that list. Pre-SWSH promo sets have none; only new
   SWSH-successor promo sets need a look.

3. **Re-stamp eligibility:** `npx tsx scripts/stamp-eligibility.ts` — it fills the
   `eligible_stage` table over REST (publishable key suffices) and prints two UPDATE
   statements; run those in the Supabase SQL editor (needs DB-admin access).

4. **Backfill art for the new cards:** uploads need a TEMPORARY write policy (the
   repo only holds the publishable key). In the SQL editor:

   ```sql
   create policy "card-art backfill (temporary)"
     on storage.objects for insert to anon
     with check (bucket_id = 'card-art');
   ```

   then `npx tsx scripts/backfill-card-art.ts` (idempotent — skips existing art,
   so interruptions are safe to re-run), then DROP the policy:

   ```sql
   drop policy "card-art backfill (temporary)" on storage.objects;
   ```

5. **Stamp `art_url`** for the newly uploaded objects (SQL editor):

   ```sql
   update public.cards c
   set art_url = 'https://wmhbvlggntwisedrvncq.supabase.co/storage/v1/object/public/card-art/' || c.card_id || '.webp'
   where c.art_url is null
     and exists (select 1 from storage.objects o
                 where o.bucket_id = 'card-art' and o.name = c.card_id || '.webp');
   ```

6. **Re-run the TCGplayer id backfill:** `npx tsx scripts/backfill-tcgplayer.ts` —
   fills `tcgplayer_stage` over REST and prints the sync UPDATEs to run in the SQL
   editor (same staging pattern as eligibility). Unmatched cards keep the Buy
   button's name-search fallback, so a skipped run degrades, never breaks. If the
   script reports a newly unmapped pack, add it to `PACK_GROUP_ALIASES` in the script.

7. **Refresh prices:** `npx tsx scripts/refresh-prices.ts` — re-reads current
   TCGplayer prices (market + listing bounds, per printing) into `price_stage` via
   the product ids from step 6 and prints the sync UPDATE. Vintage cards
   (pre-Black & White) ≥ $25 also get near-mint verification: the card's Near
   Mint SKU is resolved via TCGplayer's page APIs and its market price stamped
   verbatim (the number on the page's "Near Mint Comparison Prices" line), or
   nulled to an em dash when TCGplayer prices no NM sku. Modern cards skip the
   check (they trade NM constantly). WOTC packs whose scans show the 1st Edition
   stamp are always verified and priced as 1st Edition — Base Set resolves its
   NM sku on the Shadowless group (where TCGplayer files Base 1st Editions).
   Also worth running on its own every so often: prices drift, imports or not.

8. **Sanity-check:** `select count(*) from cards where eligible` should match the
   stamp script's printed count; the rankings meter denominator (`poolTotal` from
   `/api/rankings?playerId=...`) should show the same number; play a few rounds and
   confirm new-set cards appear with art. Cards missed by the backfill fall back to
   their pkmncards `image_url` automatically, so a partial run degrades gracefully.

Order matters only for 3 → 4/5 (the backfill targets the stamped column). If the
eligibility RULES change (not just new data), the same procedure applies from step 3.

### Note files (keep these updated as we go)

- `TODO.md` — planned work. Check the box when a task is done.
- `DONE.md` — completed tasks (with their original spec).
- `LEARN.md` — open questions to self-quiz on; append after each meaningful change.
- `DEVELOPMENT.md` — this file (setup + workflow).
