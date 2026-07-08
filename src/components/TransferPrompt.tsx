"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { clearAnonymousPlayerId, peekAnonymousPlayerId } from "@/lib/playerId";

// After signing in, offer to move this browser's anonymous history into the
// account — but only when there is something to move (the anonymous id has
// comparisons) and the account is fresh (no comparisons of its own; two Glicko
// histories for the same card can't be merged, and transfer_player_data
// enforces the same rule server-side). The user's answer is remembered per
// account in localStorage so the question is asked exactly once per browser.
// Renders nothing until an offer is actually on the table.

const RESOLVED_KEY_PREFIX = "pokemash_transfer_resolved:";

type Offer = { anonId: string; userId: string; count: number };

export default function TransferPrompt() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // onAuthStateChange also fires on token refreshes; one eligibility check per
  // page load is enough.
  const checkedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user || checkedRef.current) return;
      checkedRef.current = true;

      const anonId = peekAnonymousPlayerId();
      if (!anonId || anonId === user.id) return;
      const resolvedKey = RESOLVED_KEY_PREFIX + user.id;
      if (localStorage.getItem(resolvedKey)) return;

      void (async () => {
        const [anon, mine] = await Promise.all([
          supabase
            .from("comparisons")
            .select("*", { count: "exact", head: true })
            .eq("player_id", anonId),
          supabase
            .from("comparisons")
            .select("*", { count: "exact", head: true })
            .eq("player_id", user.id),
        ]);
        // Can't tell (network/db hiccup): stay silent and re-check next load.
        if (anon.error || mine.error) return;
        // Nothing to move, or the account already has its own history — settle
        // the question for good without asking.
        if (!anon.count || mine.count) {
          localStorage.setItem(resolvedKey, "1");
          return;
        }
        setOffer({ anonId, userId: user.id, count: anon.count });
      })();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!offer) return null;

  async function transfer() {
    setBusy(true);
    setFailed(false);
    const { error } = await createClient().rpc("transfer_player_data", {
      anon_player: offer!.anonId,
    });
    if (error) {
      setBusy(false);
      setFailed(true);
      return;
    }
    localStorage.setItem(RESOLVED_KEY_PREFIX + offer!.userId, "1");
    // The anonymous rows now belong to the account; drop the stale id so
    // signing out later starts a genuinely fresh anonymous history.
    clearAnonymousPlayerId();
    window.location.reload();
  }

  function decline() {
    localStorage.setItem(RESOLVED_KEY_PREFIX + offer!.userId, "1");
    // The anonymous history stays put — it's still there when signed out.
    setOffer(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-neutral-800">
          Transfer your progress?
        </h2>
        <p className="mb-5 text-sm text-neutral-600">
          You&rsquo;ve made{" "}
          <span className="font-semibold">
            {offer.count} comparison{offer.count === 1 ? "" : "s"}
          </span>{" "}
          on this device before signing in. Would you like to transfer that
          local data to your account? It becomes your account&rsquo;s rankings,
          on every device.
        </p>

        {failed && (
          <p className="mb-3 text-sm text-red-600">
            The transfer didn&rsquo;t go through — please try again.
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={transfer}
            disabled={busy}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
          >
            {busy ? "Transferring…" : "Transfer"}
          </button>
          <button
            type="button"
            onClick={decline}
            disabled={busy}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 font-semibold text-neutral-800 transition-all hover:bg-neutral-50 active:scale-95 disabled:opacity-50"
          >
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}
