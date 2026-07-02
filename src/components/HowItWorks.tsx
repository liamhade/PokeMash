"use client";

import { useState } from "react";
import { navPillClass } from "./NavButton";

// Nav-bar "How it works" button plus the modal it opens: a plain-language
// explanation of the card ratings (chess-style ELO — ours is Glicko-2, an ELO
// refinement, but the mental model users need is "winner takes points").
// Follows FilterModal's overlay conventions: click-outside or × to close.
export default function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={navPillClass}>
        {/* The full label crowds a phone-width bar; "About" stands in below md. */}
        <span className="hidden md:inline">How it works</span>
        <span className="md:hidden">About</span>
      </button>

      {open && (
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-neutral-700"
            >
              <span className="text-2xl leading-none">&times;</span>
            </button>

            <h2 className="mb-4 text-lg font-semibold text-neutral-800">
              How the rankings work
            </h2>

            <div className="space-y-3 text-sm text-neutral-600">
              <p>
                Every card starts with the same rating: 1200. Each time you pick
                between two cards, the one you choose <span className="font-semibold">
                wins the matchup</span> and takes rating points from the loser — the
                same idea as ELO ratings in chess.
              </p>
              <p>
                How many points change hands depends on the matchup. If a card beats a
                much higher-rated card, it earns a lot; beating a card it was already
                expected to beat earns only a little. Upsets are what move the
                rankings.
              </p>
              <p>
                The more matchups a card has been in, the more settled its rating
                becomes, so one surprising pick won&rsquo;t send an established
                favorite tumbling.
              </p>
              <p>
                Your picks only feed <span className="font-semibold">your</span>{" "}
                rankings — the list on the Rankings page is your personal taste in
                cards, sorted by rating.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
