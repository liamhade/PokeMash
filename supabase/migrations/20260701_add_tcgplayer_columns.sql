-- Adds TCGplayer linkage to `cards` for the Rankings buy-through (affiliate revenue).
--
-- Why: the card-flip on the Rankings screen shows a card's TCGplayer Near-Mint price and
-- a "Buy on TCGplayer" affiliate link. A direct product link (and a fresh price) both key
-- off the TCGplayer product id. Until this runs, the app falls back to a name-search
-- affiliate link and the existing snapshot `market_price`.
--
--   * tcgplayer_product_id — the TCGplayer productId. Powers the affiliate product URL
--     (https://www.tcgplayer.com/product/<id>) and is the join key for price refreshes.
--   * tcgplayer_url        — the canonical product page URL (TCGCSV provides it directly),
--     stored so we don't have to reconstruct it.
--
-- Backfilled from TCGCSV (a free nightly mirror of TCGplayer's catalog + prices) by
-- scripts/backfill-tcgplayer.mjs, which also refreshes `market_price` from the Near-Mint
-- market value. Both columns are nullable: ~10% of cards have no TCGplayer match/price.

alter table cards add column if not exists tcgplayer_product_id text;
alter table cards add column if not exists tcgplayer_url text;

-- Speeds up the refresh job's per-product updates.
create index if not exists cards_tcgplayer_product_id_idx on cards (tcgplayer_product_id);
