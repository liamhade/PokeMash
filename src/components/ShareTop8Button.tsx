"use client";

import { useEffect, useRef, useState } from "react";
import PillButton from "@/components/PillButton";
import { getPlayerId } from "@/lib/playerId";
import { encodeTop8, TOP8_COUNT } from "@/lib/top8";

// One-tap share of the player's current top eight: builds a /top8/<code> link
// (the code packs the card ids — see lib/top8.ts) and hands it to the native
// share sheet, falling back to the clipboard where navigator.share doesn't
// exist (most desktop browsers). Fetches the top cards fresh at tap time so
// the link is always the TRUE unfiltered top 8, whatever filters or search the
// rankings list currently shows.
export default function ShareTop8Button() {
  // A transient status line ("Link copied") floated under the button.
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flash(message: string) {
    setNote(message);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2500);
  }

  // Don't let a pending flash timer fire against an unmounted component.
  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  async function share() {
    const playerId = await getPlayerId();
    const res = await fetch(`/api/rankings?playerId=${playerId}&page=0`);
    if (!res.ok) return flash("Something went wrong");
    const data = await res.json();
    const ids = (data.rankings ?? [])
      .slice(0, TOP8_COUNT)
      .map((card: { card_id: string }) => card.card_id);
    const code = encodeTop8(ids);
    if (!code) return flash(`Rank ${TOP8_COUNT}+ cards to share`);

    const url = `${location.origin}/top8/${code}`;
    if (navigator.share) {
      // Closing the sheet without picking a target rejects — that's a choice,
      // not an error, so swallow it.
      await navigator.share({ title: "My Top 8 — CardMash", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    }
  }

  return (
    <div className="relative">
      <PillButton onClick={share}>Share</PillButton>
      {note && (
        <span className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-600 shadow-md">
          {note}
        </span>
      )}
    </div>
  );
}
