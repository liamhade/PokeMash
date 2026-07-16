import { createClient } from "@supabase/supabase-js";
import { decodeTop8 } from "@/lib/top8";

// Resolves a Top 8 share code to its cards, shared by the share page and its
// OG image. Both raw art columns come back: the page folds art_url through the
// same-origin proxy (withStorageArt), while the OG renderer needs image_url —
// the original JPEG source — because satori can't decode our WebP copies.
export type Top8Card = {
  card_id: string;
  name: string;
  image_url: string | null;
  art_url: string | null;
};

// Public catalog data only, so a plain publishable-key client — no cookies,
// which keeps the OG image independent of who's asking.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

/** The eight cards a share code names, in the code's (rank) order — or null
 * when the code is malformed or names a card that doesn't exist. */
export async function getTop8Cards(code: string): Promise<Top8Card[] | null> {
  const ids = decodeTop8(code);
  if (!ids) return null;

  const { data, error } = await supabase
    .from("cards")
    .select("card_id, name, image_url, art_url")
    .in("card_id", ids);
  if (error || !data) return null;

  // .in() returns rows in table order; the URL's order IS the ranking.
  const byId = new Map(data.map((row) => [row.card_id, row as Top8Card]));
  const ordered = ids.map((id) => byId.get(id));
  return ordered.every((card) => card !== undefined) ? (ordered as Top8Card[]) : null;
}
