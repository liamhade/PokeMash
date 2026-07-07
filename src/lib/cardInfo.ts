// Display helpers for card detail views (the flip-card backs on Rankings and Play).

// A non-empty text value, or an em dash for null/blank so detail rows read cleanly.
// Accepts undefined because the Play screen's Card fields are optional (older
// sessionStorage saves predate them).
export function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

// Pack values carry a trailing abbreviation, e.g. "Base Set (BS)"; drop it for display.
export function packName(pack: string | null | undefined): string {
  return orDash(pack ? pack.replace(/\s*\([^)]*\)\s*$/, "") : null);
}

// Link for the Buy button: the card's own TCGplayer product page when we have its
// id (cards.tcgplayer_product_id, backfilled by scripts/backfill-tcgplayer.ts), or a
// name search for the ~1.4% of cards without one. Add the affiliate partner code
// here once the program is approved — this is the only place URLs are built.
export function tcgplayerUrl(name: string, productId?: number | null): string {
  if (productId) return `https://www.tcgplayer.com/product/${productId}`;
  return `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(name)}`;
}
