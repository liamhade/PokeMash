-- Applied 2026-07-07 (via MCP). Staging table for TCGplayer price refreshes.
--
-- The catalog's price columns were a one-time import and drift from reality (Base
-- Set Charizard sat at $600 while TCGplayer's market price was $728). scripts/
-- refresh-prices.ts re-reads current prices from tcgcsv.com's daily mirror of
-- TCGplayer's price feed, joining on cards.tcgplayer_product_id, and fills this
-- stage over REST (publishable key); a DB admin then runs the UPDATE the script
-- prints. Cards missing from the stage (no product id / no price row) keep their
-- old values. Re-run whenever prices feel stale — they move continuously.

create table if not exists public.price_stage (
  card_id uuid primary key,
  market_price real,
  lowest_price real,
  highest_price real
);
alter table public.price_stage enable row level security;
create policy "anyone can stage prices" on public.price_stage
  for insert to anon with check (true);
create policy "anyone can clear staged prices" on public.price_stage
  for delete to anon using (true);
create policy "anyone can read staged prices" on public.price_stage
  for select to anon using (true);
