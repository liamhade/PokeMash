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
--   * DROP energy cards (named "<X> Energy", optionally with {symbols} or a
--     "Prism Star" tag). Trainers like "Energy Retrieval" are kept (Energy is not
--     the last word). Matched by name because the data has no card-type column.
--   * "Promo", "Rare" and "Rare Holo" are catch-all rarities mixing boring non-holos
--     / plain modern foils with the odd buzzword chase card. Keep one only if its
--     name has a featured mechanic (GX/V/VMAX/VSTAR/ex/EX/LV.X/BREAK/Prime/LEGEND/
--     Star). "Rare"/"Rare Holo" are ALSO kept when genuinely vintage — released before
--     Black & White (2011-03-09), i.e. HeartGold & SoulSilver and earlier. Full-art
--     cards always carry a distinct rarity (e.g. Reshiram 113/114 is "Ultra Rare"),
--     so this never drops a full art.
--   * KEEP everything else: all holo/ex/GX/V/VMAX/VSTAR/Illustration/Ultra/Secret/
--     Trainer Gallery/Mega rarities, etc. Per-era mechanic rares stay: regular
--     GX (Sun & Moon), V/VMAX/VSTAR (Sword & Shield), EX (XY) — but NOT the regular
--     ex of Scarlet & Violet / Mega Evolution, which is the already-dropped Double Rare.
--
-- The vintage cutoff is the start of Black & White (2011-03-01). release_date is free
-- text like "Apr 25, 2011", parsed with to_date(..., 'Mon DD, YYYY').
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
    -- Drop energy cards: strip {symbols} and "Prism Star", then exclude names whose
    -- last word is "Energy". Keeps trainers like "Energy Retrieval".
    and trim(regexp_replace(regexp_replace(c.name, '\{[^}]*\}', '', 'g'), 'prism star', '', 'gi')) !~* 'energy$'
    -- "Promo"/"Rare" are catch-all rarities: keep one only if its name has a featured
    -- mechanic (preceded by a space or hyphen at the end of the name). "Rare" is also
    -- kept when genuinely vintage — released before Black & White (2011-03-09).
    and (
      c.rarity not in ('Promo', 'Rare', 'Rare Holo')
      or c.name ~ '[ -](GX|VMAX|VSTAR|V|ex|EX|LV\.?X|BREAK|Prime|LEGEND|Star)$'
      or c.name ~ '★$'
      or (c.rarity in ('Rare', 'Rare Holo') and to_date(trim(c.release_date), 'Mon DD, YYYY') < date '2011-03-01')
    )
  order by random()
  limit sample_size;
$$;
