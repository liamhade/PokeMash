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

// Placeholder referral link — a TCGplayer name search for now. Swap to an affiliate
// product link (partner code + tcgplayer_product_id) once those are backfilled.
export function tcgplayerSearchUrl(name: string): string {
  return `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(name)}`;
}
