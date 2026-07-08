"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { avatarSrc } from "@/lib/avatars";
import { ensureProfile, saveAvatar, type Profile } from "@/lib/profile";
import AvatarPicker from "./AvatarPicker";
import { navPillClass } from "./NavButton";

// The nav bar's account corner. Signed out it's a single "Sign in" pill opening
// a modal with one Google button — with OAuth, signing up and logging in are the
// same action, so one entry point covers both (two buttons would just be clutter
// that dead-ends in the identical Google screen). Signed in, the pill becomes
// the player's chosen avatar (person icon until they pick one) whose dropdown
// shows who they are plus Friends / Choose avatar / Sign out.
// Modal follows HowItWorks' overlay conventions: click-outside or × to close.

// Google's four-color "G", inlined per their sign-in branding guidelines.
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function AccountControl() {
  // undefined = session not read yet; render nothing for that first beat rather
  // than flash "Sign in" at a signed-in user (the read is local and resolves fast).
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session
    // (INITIAL_SESSION), so one subscription covers first paint and changes.
    const { data: sub } = createClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      // Drop the profile with the session; a new sign-in reloads it below.
      if (!session) setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load (and on first sign-in, create) the profile behind the session — it
  // carries the avatar shown in the pill. Keyed on the user id so a sign-in
  // after sign-out reloads it.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    ensureProfile().then((loaded) => {
      if (!cancelled) setProfile(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function chooseAvatar(slug: string) {
    if (!userId) return;
    // Optimistic: the pill updates instantly; the row is theirs by RLS.
    setProfile((prev) => (prev ? { ...prev, avatar: slug } : prev));
    setPickerOpen(false);
    await saveAvatar(userId, slug);
  }

  async function signInWithGoogle() {
    // Full-page redirect to Google; we come back through /auth/callback.
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  async function signOut() {
    await createClient().auth.signOut();
    // Everything on screen (rankings, dials, streaks) belongs to the account
    // identity; a clean reload restarts the app as the anonymous player.
    window.location.reload();
  }

  if (user === undefined) return null;

  if (!user) {
    return (
      <>
        <button type="button" onClick={() => setModalOpen(true)} className={navPillClass}>
          Sign in
        </button>

        {modalOpen && (
          <div
            onClick={(event) => {
              if (event.target === event.currentTarget) setModalOpen(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-neutral-700"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>

              <h2 className="mb-2 text-lg font-semibold text-neutral-800">Sign in</h2>
              <p className="mb-5 text-sm text-neutral-600">
                Keep your rankings and pick up where you left off on any device.
                New here? The same button creates your account.
              </p>

              <button
                type="button"
                onClick={signInWithGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 font-semibold text-neutral-800 transition-all hover:bg-neutral-50 active:scale-95"
              >
                <GoogleG />
                Continue with Google
              </button>

              <p className="mt-4 text-xs text-neutral-400">
                We store your email address and your comparison history — nothing
                else. See the{" "}
                <a href="/privacy" className="underline hover:text-neutral-600">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  const avatar = avatarSrc(profile?.avatar);
  const menuItemClass =
    "block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 hover:text-red-600";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Account"
        aria-expanded={menuOpen}
        className={navPillClass}
      >
        {avatar ? (
          /* Their chosen Pokémon; pixelated so the 96px sprite stays crisp. */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={avatar}
            alt=""
            width={52}
            height={52}
            className="h-[52px] w-[52px] [image-rendering:pixelated]"
          />
        ) : (
          /* Minimal person glyph; currentColor picks up the pill's hover red. */
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="3.6" />
            <path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
          </svg>
        )}
      </button>

      {menuOpen && (
        <>
          {/* Invisible backdrop: clicking anywhere else closes the menu. */}
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-max max-w-[80vw] rounded-xl border border-neutral-100 bg-white p-2 shadow-xl">
            <p className="truncate px-3 py-2 text-sm text-neutral-500">{user.email}</p>
            <Link href="/friends" onClick={() => setMenuOpen(false)} className={menuItemClass}>
              Friends
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setPickerOpen(true);
              }}
              className={menuItemClass}
            >
              Choose avatar
            </button>
            <button type="button" onClick={signOut} className={menuItemClass}>
              Sign out
            </button>
          </div>
        </>
      )}

      {pickerOpen && (
        <AvatarPicker
          current={profile?.avatar ?? null}
          onSelect={chooseAvatar}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
