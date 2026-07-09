import { createClient } from "@/utils/supabase/client";

// Client-side profile access. A profile row exists for every signed-in user
// (created lazily by the ensure_profile RPC on first sign-in) and carries the
// avatar, display name, and the shareable friend code.

export type Profile = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  friend_code: string;
  // False until the user has resolved the one-time username prompt (by saving a
  // name or dismissing it); drives whether that prompt shows on sign-in.
  name_chosen: boolean;
};

const PROFILE_COLUMNS = "user_id, display_name, avatar, friend_code, name_chosen";

/** The signed-in user's profile, creating it on first sign-in. Null when
 * nobody is signed in. Reads first and only calls the RPC on a miss, so the
 * common path is a single select. */
export async function ensureProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return null;

  const read = () =>
    supabase.from("profiles").select(PROFILE_COLUMNS).eq("user_id", userId).maybeSingle();

  const { data: profile } = await read();
  if (profile) return profile;
  await supabase.rpc("ensure_profile");
  return (await read()).data;
}

/** Persist the user's avatar pick. RLS restricts the update to their own row
 * (and column grants to display_name/avatar), so no ownership check is needed
 * here. */
export async function saveAvatar(userId: string, slug: string): Promise<boolean> {
  const { error } = await createClient()
    .from("profiles")
    .update({ avatar: slug })
    .eq("user_id", userId);
  return !error;
}

/** Save a chosen username. Also marks the prompt resolved, so saving from the
 * first-sign-in prompt settles it for good. Caller trims/validates length
 * (the DB check constraint is 1–40 chars). */
export async function saveDisplayName(userId: string, name: string): Promise<boolean> {
  const { error } = await createClient()
    .from("profiles")
    .update({ display_name: name, name_chosen: true })
    .eq("user_id", userId);
  return !error;
}

/** Dismiss the username prompt without changing the name — the email-derived
 * default stays, and the prompt won't show again. */
export async function dismissNamePrompt(userId: string): Promise<boolean> {
  const { error } = await createClient()
    .from("profiles")
    .update({ name_chosen: true })
    .eq("user_id", userId);
  return !error;
}
