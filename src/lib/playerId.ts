import { createClient } from "@/utils/supabase/client";

const STORAGE_KEY = "pokemash_player_id";

/** The pre-account identity: a UUID generated client-side and kept in
 * localStorage. Minted on first use; still the active identity whenever
 * nobody is signed in. */
export function getAnonymousPlayerId(): string {
  let playerId = localStorage.getItem(STORAGE_KEY);
  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, playerId);
  }
  return playerId;
}

/** The anonymous id if this browser already has one, without minting a new one
 * — the transfer prompt must not invent an empty history to offer. */
export function peekAnonymousPlayerId(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

/** Forget the anonymous identity. Called after its rows were transferred into
 * an account; the stale id would otherwise resurface an empty history on
 * sign-out. A fresh id is minted on the next anonymous comparison. */
export function clearAnonymousPlayerId(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Whose data to read and write: the signed-in Supabase user when there is a
 * session, otherwise the anonymous localStorage id. Async because the session
 * lives behind supabase-js's storage API — a local read, no network unless an
 * expired token needs refreshing. */
export async function getPlayerId(): Promise<string> {
  const { data } = await createClient().auth.getSession();
  return data.session?.user.id ?? getAnonymousPlayerId();
}
