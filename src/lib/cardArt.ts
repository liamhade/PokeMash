// Card art source resolution, shared by the API routes.
//
// Art lives in two places: `art_url` points at our Supabase Storage copy (backfilled
// by scripts/backfill-card-art.ts — pre-resized WebP, sized for the app's largest
// rendering), and `image_url` is the original pkmncards.com source. We serve our own
// copy when it exists and fall back to the source for cards the backfill hasn't
// covered yet (e.g. newly imported sets), so a stale backfill degrades gracefully
// instead of breaking art.

// Folds art_url into image_url and drops it, so API payloads keep a single image
// field and the client never needs to know where the art is hosted.
export function withStorageArt<T extends { image_url: string | null; art_url: string | null }>(
  row: T,
): Omit<T, "art_url"> {
  const { art_url, ...rest } = row;
  return { ...rest, image_url: art_url ?? rest.image_url };
}
