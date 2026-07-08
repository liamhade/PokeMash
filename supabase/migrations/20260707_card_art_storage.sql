-- Applied 2026-07-07 (via MCP). Storage-hosted card art: pre-resized WebPs live in
-- the public `card-art` bucket as {card_id}.webp (uploaded by
-- scripts/backfill-card-art.ts), and cards.art_url points at the public URL. The
-- app serves art_url when present and falls back to the original image_url
-- (pkmncards.com). art_url is stamped after a backfill with:
--
--   update public.cards c
--   set art_url = 'https://wmhbvlggntwisedrvncq.supabase.co/storage/v1/object/public/card-art/' || c.card_id || '.webp'
--   where c.art_url is null
--     and exists (select 1 from storage.objects o
--                 where o.bucket_id = 'card-art' and o.name = c.card_id || '.webp');

alter table public.cards add column if not exists art_url text;

insert into storage.buckets (id, name, public)
values ('card-art', 'card-art', true)
on conflict (id) do update set public = true;
