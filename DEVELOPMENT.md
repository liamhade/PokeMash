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

## Branch & commit workflow

We collaborate on `main`, so **all of my work happens on a separate branch** to avoid
interfering with my collaborator.

- **Working branch:** `dev-tessa` (branched off `main`).
- **One commit per change or subtask.** If several edits all serve the same subtask,
  they go in a single commit; unrelated changes get their own commits. This keeps
  history easy to read and easy to revert.
- **Commit messages** describe *what* changed and *why*, in the imperative mood
  (e.g. `Add dark-mode toggle to navbar`).
- Code follows our SE principles: small, readable, well-commented changes (YAGNI,
  DRY, single responsibility).

### Note files (keep these updated as we go)

- `TODO.md` — planned work. Check the box when a task is done.
- `DONE.md` — completed tasks (with their original spec).
- `LEARN.md` — open questions to self-quiz on; append after each meaningful change.
- `DEVELOPMENT.md` — this file (setup + workflow).

## TCGplayer referral (Rankings card-flip)

The Rankings card-flip shows a card's TCGplayer Near-Mint price and an affiliate "Buy on
TCGplayer" link. Two optional env vars in `.env.local`:

```ini
# Affiliate partner code from the Impact dashboard (once approved). Public — the buy
# link is built client-side. Without it, links still work but aren't referral-tracked.
NEXT_PUBLIC_TCGPLAYER_PARTNER_CODE=<impact partner code>

# Service-role key (Supabase → Project Settings → API). Server/CLI only — never expose.
# Needed ONLY to run the backfill below with --write.
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

**Price + product-id backfill** (`scripts/backfill-tcgplayer.mjs`): matches our cards to
TCGplayer products via [TCGCSV](https://tcgcsv.com) and fills `tcgplayer_product_id` /
`tcgplayer_url` and refreshes `market_price`.

```bash
node scripts/backfill-tcgplayer.mjs           # dry run: prints the match rate, writes nothing
node scripts/backfill-tcgplayer.mjs --write    # applies (needs the migration + service-role key)
```

Run `supabase/migrations/20260701_add_tcgplayer_columns.sql` first (needs DB write access).
Re-run `--write` nightly to keep prices fresh.
