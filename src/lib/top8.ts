// The "My Top 8" share code: eight card ids packed INTO the URL itself.
//
// The link deliberately carries the cards, not the player. A playerId in a
// shared URL would leak the sharer's identity to every recipient — and for
// anonymous players the UUID is literally the ownership proof that
// transfer_player_data() accepts, so a shared link could hand a stranger the
// sharer's whole history. Packing the card ids instead also makes the share an
// immutable snapshot: the page never drifts after the moment it was shared.
//
// Format: the 8 uuids' raw bytes (8 × 16 = 128) concatenated, base64url-encoded
// (172 chars). Runs in both the browser (share button) and on the server (share
// page + OG image), so it uses atob/btoa rather than Buffer.

export const TOP8_COUNT = 8;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BYTES_PER_UUID = 16;

/** Pack exactly TOP8_COUNT card uuids (rank order) into a URL-safe code.
 * Returns null if the input isn't eight well-formed uuids. */
export function encodeTop8(cardIds: string[]): string | null {
  if (cardIds.length !== TOP8_COUNT || !cardIds.every((id) => UUID_PATTERN.test(id))) {
    return null;
  }
  const hex = cardIds.join("").replaceAll("-", "");
  const bytes = hex.match(/.{2}/g)!.map((pair) => parseInt(pair, 16));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

/** Unpack a share code back into the eight card uuids, or null for anything
 * malformed — the strict shape check is what keeps junk codes from ever
 * reaching a database query. */
export function decodeTop8(code: string): string[] | null {
  // Reject anything that isn't plain base64url of the exact expected length
  // before touching atob (which tolerates some malformed input).
  if (!/^[0-9a-zA-Z_-]+$/.test(code)) return null;
  let binary: string;
  try {
    binary = atob(code.replaceAll("-", "+").replaceAll("_", "/"));
  } catch {
    return null;
  }
  if (binary.length !== TOP8_COUNT * BYTES_PER_UUID) return null;

  const hex = [...binary].map((ch) => ch.charCodeAt(0).toString(16).padStart(2, "0")).join("");
  const ids: string[] = [];
  for (let i = 0; i < TOP8_COUNT; i += 1) {
    const h = hex.slice(i * 32, (i + 1) * 32);
    ids.push(
      `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`,
    );
  }
  return ids;
}
