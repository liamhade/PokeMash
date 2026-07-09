"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { dismissNamePrompt, ensureProfile, saveDisplayName, type Profile } from "@/lib/profile";
import UsernameModal from "./UsernameModal";

// On a new user's first sign-in, offer to pick a username. ensure_profile seeds
// display_name from the email local part; this lets them replace it (or keep it
// by dismissing). `name_chosen` on the profile — resolved to true either way —
// makes the offer fire exactly once, so returning users never see it. Renders
// nothing until a fresh, unresolved profile is loaded.

export default function UsernamePrompt() {
  const [profile, setProfile] = useState<Profile | null>(null);
  // onAuthStateChange also fires on token refreshes; one check per load is enough.
  const checkedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user || checkedRef.current) return;
      checkedRef.current = true;

      void (async () => {
        // ensureProfile creates the row on a true first sign-in and returns it;
        // name_chosen is the server's record of whether we've asked before.
        const loaded = await ensureProfile();
        if (loaded && !loaded.name_chosen) setProfile(loaded);
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!profile) return null;

  function resolve(action: Promise<boolean>) {
    // Optimistically dismiss; if the write fails, name_chosen stays false and
    // the prompt simply returns next load — no data is lost either way.
    setProfile(null);
    void action;
  }

  return (
    <UsernameModal
      initialName={profile.display_name}
      title="Choose a username"
      secondaryLabel="Skip for now"
      onSave={(name) => resolve(saveDisplayName(profile.user_id, name))}
      onDismiss={() => resolve(dismissNamePrompt(profile.user_id))}
    />
  );
}
