// Builds TCGplayer affiliate links for the Rankings buy-through (our referral revenue).
//
// The partner code comes from the Impact dashboard once the affiliate application is
// approved. It's a NEXT_PUBLIC_ var because the link is built on the client. Until it's
// set, we still emit a working (just untracked) TCGplayer link so the feature is testable.
const PARTNER_CODE = process.env.NEXT_PUBLIC_TCGPLAYER_PARTNER_CODE ?? "";

// TCGplayer's affiliate deep-link is a normal destination URL plus these tracking params
// (partner + matching utm_*). Confirm the exact params in Impact's link generator.
function withAffiliateParams(destination: string): string {
  if (!PARTNER_CODE) return destination;
  const params = new URLSearchParams({
    partner: PARTNER_CODE,
    utm_campaign: "affiliate",
    utm_medium: PARTNER_CODE,
    utm_source: PARTNER_CODE,
  });
  const separator = destination.includes("?") ? "&" : "?";
  return `${destination}${separator}${params.toString()}`;
}

/**
 * Affiliate URL for a card. Prefers a direct product page when we know the TCGplayer
 * `productId` (backfilled from TCGCSV once we have DB write access); until then it falls
 * back to an affiliate-tracked search by card name, so the referral works immediately.
 */
export function tcgplayerAffiliateUrl(card: {
  productId?: string | null;
  name: string;
}): string {
  const destination = card.productId
    ? `https://www.tcgplayer.com/product/${card.productId}`
    : `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(card.name)}`;
  return withAffiliateParams(destination);
}
