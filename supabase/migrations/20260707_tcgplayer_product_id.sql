-- Applied 2026-07-07 (via MCP). TCGplayer product ids for direct Buy links.
--
-- cards.tcgplayer_product_id points the CardBack referral button at the card's own
-- TCGplayer product page (tcgplayer.com/product/{id}) instead of a name search.
-- Ids are matched from tcgcsv.com (a daily mirror of TCGplayer's catalog) by
-- scripts/backfill-tcgplayer.ts: the script fills tcgplayer_stage over REST (the
-- publishable key may write it — it holds no data of its own and only matters at
-- sync time), then a DB admin runs the UPDATE the script prints. Cards without an
-- id (unmatched ~1.4%) keep the name-search fallback in src/lib/cardInfo.ts.
-- Re-run the script after catalog imports.

alter table public.cards add column if not exists tcgplayer_product_id integer;

create table if not exists public.tcgplayer_stage (
  card_id uuid primary key,
  product_id integer not null
);
alter table public.tcgplayer_stage enable row level security;
create policy "anyone can stage tcgplayer ids" on public.tcgplayer_stage
  for insert to anon with check (true);
create policy "anyone can clear staged tcgplayer ids" on public.tcgplayer_stage
  for delete to anon using (true);
create policy "anyone can read staged tcgplayer ids" on public.tcgplayer_stage
  for select to anon using (true);
