const STORAGE_KEY = "pokemash_player_id";

/** Anonymous-first identity: a UUID generated client-side and kept in localStorage
 * until the user creates an account and it gets migrated to a real user id. */
export function getPlayerId(): string {
  let playerId = localStorage.getItem(STORAGE_KEY);
  if (!playerId) {
    playerId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, playerId);
  }
  return playerId;
}
