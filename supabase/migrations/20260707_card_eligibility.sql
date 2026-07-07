-- Applied 2026-07-07 (via MCP). Materialized comparison-pool eligibility.
--
-- The rules live in src/lib/comparisonPool.ts (isPoolEligible) and are stamped into
-- cards.eligible by scripts/stamp-eligibility.ts: the script fills eligible_stage
-- over REST (the publishable key may write it — it holds no data of its own and only
-- matters at sync time), then a DB admin runs the two UPDATEs the script prints. The
-- API routes filter on the column instead of re-deriving the rules per request.
-- Re-stamp after catalog imports or rule changes.

alter table public.cards add column if not exists eligible boolean not null default false;
create index if not exists cards_eligible_idx on public.cards (card_id) where eligible;

create table if not exists public.eligible_stage (card_id uuid primary key);
alter table public.eligible_stage enable row level security;
create policy "anyone can stage eligibility" on public.eligible_stage
  for insert to anon with check (true);
create policy "anyone can clear staged eligibility" on public.eligible_stage
  for delete to anon using (true);
create policy "anyone can read staged eligibility" on public.eligible_stage
  for select to anon using (true);
