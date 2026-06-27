"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getPlayerId } from "@/lib/playerId";

type Card = { card_id: string; name: string; image_url: string };

// Each card tracks its own vertical position so that in "Keep Winner" mode we can
// hold the winner at center while only the loser slides out and is replaced.
type Position = "below" | "center" | "above";

const POSITION_CLASS: Record<Position, string> = {
  below: "translate-y-[120vh]",
  center: "translate-y-0",
  above: "-translate-y-[120vh]",
};

function positionsFor(cards: Card[], position: Position): Record<string, Position> {
  return Object.fromEntries(cards.map((card) => [card.card_id, position]));
}

export default function ComparisonScreen() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [pos, setPos] = useState<Record<string, Position>>({});
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [keepWinner, setKeepWinner] = useState(false);
  // True only when both cards are settled at center and a pick is allowed. Guards
  // against picking mid-animation or double-submitting a comparison.
  const [ready, setReady] = useState(false);

  // Read the toggle inside async callbacks without making them depend on it.
  const keepWinnerRef = useRef(keepWinner);
  useEffect(() => {
    keepWinnerRef.current = keepWinner;
  }, [keepWinner]);

  const loadNextPair = useCallback(async () => {
    const playerId = getPlayerId();
    const res = await fetch(`/api/comparison/next?playerId=${playerId}`);
    const { cards: next } = (await res.json()) as { cards: Card[] };

    // Clear the outgoing cards first so the new pair mounts below the screen
    // without the old (now off-screen-above) cards re-rendering at center.
    setPickedId(null);
    setHoveredId(null);
    setCards(null);
    setPos({});
    requestAnimationFrame(() => {
      setCards(next);
      setPos(positionsFor(next, "below"));
      // Let the blank screen render for a beat before the cards slide in.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPos(positionsFor(next, "center"));
          setTimeout(() => setReady(true), 500);
        }),
      );
    });
  }, []);

  useEffect(() => {
    loadNextPair();
  }, [loadNextPair]);

  // Keep Winner mode: hold the winner at center, slide the loser out, and slide a
  // freshly chosen challenger up into the loser's now-empty slot.
  async function swapLoserForFresh(winner: Card, loser: Card, playerId: string) {
    const res = await fetch(
      `/api/comparison/next?playerId=${playerId}&winnerId=${winner.card_id}`,
    );
    const { cards: next } = (await res.json()) as { cards: Card[] };
    const fresh = next.find((card) => card.card_id !== winner.card_id)!;

    setPos((prev) => ({ ...prev, [loser.card_id]: "above" }));

    setTimeout(() => {
      setPickedId(null);
      setHoveredId(null);
      setCards((prev) =>
        prev!.map((card) => (card.card_id === loser.card_id ? fresh : card)),
      );
      setPos((prev) => {
        const updated = { ...prev };
        delete updated[loser.card_id];
        updated[fresh.card_id] = "below";
        return updated;
      });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setPos((prev) => ({ ...prev, [fresh.card_id]: "center" }));
          setTimeout(() => setReady(true), 500);
        }),
      );
    }, 500);
  }

  async function handlePick(winner: Card) {
    if (!ready || !cards) return;
    const loser = cards.find((card) => card.card_id !== winner.card_id)!;
    setReady(false);
    setPickedId(winner.card_id);

    const playerId = getPlayerId();
    // Await the comparison before fetching the next card so the swap's "already
    // compared" history includes this result (otherwise the just-beaten loser
    // could be served right back as the fresh challenger).
    await fetch("/api/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        winnerCardId: winner.card_id,
        loserCardId: loser.card_id,
      }),
    });

    if (keepWinnerRef.current) {
      await swapLoserForFresh(winner, loser, playerId);
    } else {
      setPos(positionsFor(cards, "above"));
      setTimeout(() => loadNextPair(), 500);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-white relative overflow-hidden">
      <div className="flex justify-end px-6 py-4">
        <label className="flex cursor-pointer select-none items-center gap-3">
          <span className="font-semibold text-neutral-800">Keep Winner</span>
          <button
            type="button"
            role="switch"
            aria-checked={keepWinner}
            onClick={() => setKeepWinner((on) => !on)}
            className={[
              "relative h-7 w-12 rounded-full transition-colors duration-200",
              keepWinner ? "bg-red-600" : "bg-neutral-300",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-200",
                keepWinner ? "translate-x-5" : "",
              ].join(" ")}
            />
          </button>
        </label>
      </div>

      <div className="flex flex-1 items-center justify-center gap-8 pb-40 relative z-10">
        {cards?.map((card) => {
          const isPicked = pickedId === card.card_id;
          const isHovered = hoveredId === card.card_id && ready;

          return (
            <button
              key={card.card_id}
              onClick={() => handlePick(card)}
              onMouseEnter={() => setHoveredId(card.card_id)}
              onMouseLeave={() => setHoveredId(null)}
              className={[
                "relative rounded-xl transition-all duration-500 ease-out",
                POSITION_CLASS[pos[card.card_id] ?? "below"],
                isHovered ? "scale-110" : "scale-100",
                isHovered ? "shadow-[0_0_40px_12px_rgba(0,0,0,0.25)]" : "",
                isPicked ? "shadow-[0_0_40px_12px_rgba(34,197,94,0.9)]" : "",
              ].join(" ")}
            >
              <Image
                src={card.image_url}
                alt={card.name}
                width={260}
                height={360}
                className="rounded-xl"
                priority
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
