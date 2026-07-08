"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { avatarSrc } from "@/lib/avatars";
import { ensureProfile, type Profile } from "@/lib/profile";

// Friends live behind an account (an anonymous browser id isn't shareable).
// Adding works by exchanging friend codes — never by searching emails — so
// handing someone your code is both the request and the consent, and the
// friendship is mutual the moment they enter it. A friend's row links to
// their rankings.

type Friend = { user_id: string; display_name: string; avatar: string | null };

// The raised messages from the add_friend function, translated for the UI.
const ADD_ERRORS: Record<string, string> = {
  "no player with that code": "No player has that code — check it and try again.",
  "that is your own code": "That's your own code — share it with a friend instead.",
};

function FriendAvatar({ friend }: { friend: Friend }) {
  const src = avatarSrc(friend.avatar);
  if (!src) {
    // Same default person glyph as the nav pill, for friends without a pick.
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        aria-hidden="true"
        className="text-neutral-400"
      >
        <circle cx="12" cy="8" r="3.6" />
        <path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
      </svg>
    );
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 [image-rendering:pixelated]"
    />
  );
}

export default function FriendsPage() {
  // profile: undefined = still loading, null = signed out.
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [code, setCode] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadFriends(userId: string) {
    const supabase = createClient();
    // RLS returns only this user's friendship rows; map each to the other id,
    // then resolve those profiles (readable via the friends select policy).
    const { data: rows } = await supabase.from("friendships").select("user_a, user_b");
    const ids = (rows ?? []).map((row) => (row.user_a === userId ? row.user_b : row.user_a));
    if (ids.length === 0) {
      setFriends([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar")
      .in("user_id", ids)
      .order("display_name");
    setFriends(data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    ensureProfile().then(async (loaded) => {
      if (cancelled) return;
      setProfile(loaded);
      if (loaded) await loadFriends(loaded.user_id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function addFriend(event: React.FormEvent) {
    event.preventDefault();
    if (!profile || !code.trim() || adding) return;
    setAdding(true);
    setAddError(null);
    const { error } = await createClient().rpc("add_friend", { code: code.trim() });
    setAdding(false);
    if (error) {
      setAddError(ADD_ERRORS[error.message] ?? "Couldn't add that friend — please try again.");
      return;
    }
    setCode("");
    await loadFriends(profile.user_id);
  }

  async function removeFriend(friendId: string) {
    if (!profile) return;
    setFriends((prev) => prev.filter((friend) => friend.user_id !== friendId));
    // The pair is stored in canonical order; cover both orders rather than
    // recomputing least/greatest client-side.
    await createClient()
      .from("friendships")
      .delete()
      .or(
        `and(user_a.eq.${profile.user_id},user_b.eq.${friendId}),` +
          `and(user_a.eq.${friendId},user_b.eq.${profile.user_id})`,
      );
  }

  async function copyCode() {
    if (!profile) return;
    await navigator.clipboard.writeText(profile.friend_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (profile === undefined) {
    return <p className="py-20 text-center text-neutral-500">Loading…</p>;
  }

  if (profile === null) {
    return (
      <div className="py-20 text-center text-neutral-500">
        <p>Sign in to add friends and see their rankings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold text-neutral-800">Friends</h1>
      <p className="mb-8 text-sm text-neutral-500">
        Swap codes with a friend to see each other&rsquo;s rankings.
      </p>

      {/* Your code, ready to hand out. */}
      <div className="mb-8 flex items-center gap-3">
        <span className="text-sm text-neutral-500">Your code</span>
        <span className="rounded-lg bg-neutral-100 px-3 py-1.5 font-mono text-base font-semibold tracking-widest text-neutral-800">
          {profile.friend_code}
        </span>
        <button
          type="button"
          onClick={copyCode}
          className="text-sm font-semibold text-neutral-500 transition-colors hover:text-red-600"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Add by code. */}
      <form onSubmit={addFriend} className="mb-10">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Friend's code"
            maxLength={8}
            className="w-44 rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none transition-colors focus:border-neutral-500"
          />
          <button
            type="submit"
            disabled={adding || code.trim().length === 0}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-40"
          >
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </form>

      {/* The friends themselves; each row opens their rankings. */}
      {friends.length === 0 ? (
        <p className="text-sm text-neutral-400">
          No friends yet — share your code to add your first.
        </p>
      ) : (
        <ul className="space-y-1">
          {friends.map((friend) => (
            <li key={friend.user_id} className="group flex items-center gap-1">
              <Link
                href={`/rankings?player=${friend.user_id}`}
                className="flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-neutral-50"
              >
                <FriendAvatar friend={friend} />
                <span className="font-semibold text-neutral-800">{friend.display_name}</span>
                <span className="ml-auto text-sm text-neutral-400 transition-colors group-hover:text-red-600">
                  Rankings →
                </span>
              </Link>
              <button
                type="button"
                onClick={() => removeFriend(friend.user_id)}
                aria-label={`Remove ${friend.display_name}`}
                title="Remove friend"
                className="rounded-lg px-2 py-1 text-lg leading-none text-transparent transition-colors hover:text-red-600 group-hover:text-neutral-300 group-hover:hover:text-red-600"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
