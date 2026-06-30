-- comparison_pool(): the set of cards eligible to be compared on the Play screen.
--
-- Why this exists: comparing Common/Uncommon cards is boring, and "interesting"
-- differs by era. Rather than enumerate ~38 keep-able rarities, we DROP the few
-- boring/non-full-art ones and keep everything else, with one era-dependent rule
-- for plain "Rare" (see below). Encoding this in SQL (a) runs over all ~23k cards
-- instead of PostgREST's 1000-row select cap, and (b) keeps the domain rule in one
-- tunable place that the API just reads from.
--
-- Eligibility rule:
--   * DROP always: Common, Uncommon, No Rarity, Double Rare (modern ex = not full art).
--   * Plain "Rare": era-dependent. Kept only for VINTAGE sets (release year < 2023),
--     because pre-2023 a "Rare" is a real chase card, whereas in the modern
--     (Scarlet & Violet, 2023+) ladder "Rare" is a non-full-art black-star common-ish
--     card sitting below Double Rare / Illustration Rare / etc.
--   * KEEP everything else: all holo/ex/GX/V/VMAX/VSTAR/Illustration/Ultra/Secret/
--     Promo/Trainer Gallery/Mega rarities, etc.
--
-- VINTAGE_CUTOFF_YEAR is 2023. To shift the vintage/modern boundary, change the
-- literal below. release_date is free text like " May 22, 2026", so we pull the
-- first 4-digit run as the year.
--
-- order by random() + limit gives each request a varied eligible sample (the API's
-- pair-selection then works within that sample), the same intent as the old
-- per-request JS shuffle but now drawn from the whole eligible pool.

create or replace function comparison_pool(sample_size int default 1000)
returns table (card_id uuid, name text, image_url text)
language sql
stable
as $$
  select c.card_id, c.name, c.image_url
  from cards c
  where c.rarity not in ('Common', 'Uncommon', 'No Rarity', 'Double Rare')
    and (
      c.rarity <> 'Rare'
      or coalesce((regexp_match(c.release_date, '(\d{4})'))[1]::int, 0) < 2023
    )
  order by random()
  limit sample_size;
$$;
