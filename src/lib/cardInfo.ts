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

// market_price is 0 when there's no sales data; treat that (and null/undefined —
// the Play screen's Card fields are optional) as "no price".
export function formatPrice(price: number | null | undefined): string {
  return price ? `$${price.toFixed(2)}` : "—";
}

// Our TCGplayer affiliate link (Impact program): /c/<publisher>/<campaign>/<program>.
// Deep-linking to a specific page is done by passing the destination URL, encoded,
// as the `u` parameter — Impact tracks the click, then forwards to `u`.
const AFFILIATE_LINK = "https://partner.tcgplayer.com/c/7449011/1780961/21018";

// Our eBay Partner Network campaign id. ebayUrl appends EPN's tracking
// parameters so purchases credit us.
const EBAY_CAMPAIGN_ID = "5339165455";

// Link for the eBay Buy button: a search for the card, scoped by pack to cut
// same-name noise (eBay has no stable per-card page — listings churn, so search
// is the durable target). Pack/cardId are optional like the Play screen's Card
// fields; cardId rides EPN's customid so transaction reports show which card
// drove each purchase.
export function ebayUrl(name: string, pack?: string | null, cardId?: string | null): string {
  const query = ["pokemon", name, pack ? packName(pack) : ""].filter(Boolean).join(" ");
  const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
  // mkcid=1 (EPN) / mkrid (US rotation id) / toolid identify the program;
  // campid is what makes the click ours.
  const customid = cardId ? `&customid=${encodeURIComponent(cardId)}` : "";
  return `${url}&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${EBAY_CAMPAIGN_ID}${customid}&toolid=10001&mkevt=1`;
}

// Link for the Buy button: the card's own TCGplayer product page when we have its
// id (cards.tcgplayer_product_id, backfilled by scripts/backfill-tcgplayer.ts), or a
// name search for the ~1.4% of cards without one. Both are wrapped in our affiliate
// link so the purchase is credited to us — this is the only place URLs are built.
export function tcgplayerUrl(name: string, productId?: number | null): string {
  const destination = productId
    ? `https://www.tcgplayer.com/product/${productId}`
    : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(name)}`;
  return `${AFFILIATE_LINK}?u=${encodeURIComponent(destination)}`;
}
