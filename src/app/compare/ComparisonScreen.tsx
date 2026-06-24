"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { getPlayerId } from "@/lib/playerId";

type Card = { card_id: string; name: string; image_url: string };

// (1) blank -> (2) cards enter from below -> (3) idle side-by-side -> (4) hover
// grow/glow -> (5) click glow green -> (6) exit upward + Supabase update -> repeat.
type Phase = "blank" | "entering" | "idle" | "exiting";

export default function ComparisonScreen() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [phase, setPhase] = useState<Phase>("blank");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const loadNextPair = useCallback(async () => {
    const playerId = getPlayerId();
    const res = await fetch(`/api/comparison/next?playerId=${playerId}`);
    const { cards } = await res.json();
    // Clear the outgoing cards first so the new pair mounts below the screen
    // without the old (now off-screen-above) cards re-rendering at "blank".
    setCards(null);
    setPickedId(null);
    setPhase("blank");
    requestAnimationFrame(() => {
      setCards(cards);
      // Let the blank screen render for a beat before the cards slide in.
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("entering")));
    });
  }, []);

  useEffect(() => {
    loadNextPair();
  }, [loadNextPair]);

  useEffect(() => {
    if (phase !== "entering") return;
    const timeout = setTimeout(() => setPhase("idle"), 500);
    return () => clearTimeout(timeout);
  }, [phase]);

  async function handlePick(winner: Card) {
    if (phase !== "idle" || !cards) return;
    const loser = cards.find((card) => card.card_id !== winner.card_id)!;
    setPickedId(winner.card_id);

    const playerId = getPlayerId();
    const submit = fetch("/api/comparison", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        winnerCardId: winner.card_id,
        loserCardId: loser.card_id,
      }),
    });

    setTimeout(() => setPhase("exiting"), 350);
    setTimeout(() => loadNextPair(), 850);
    await submit;
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center gap-8 overflow-hidden bg-neutral-950">
      {cards?.map((card) => {
        const isPicked = pickedId === card.card_id;
        const isHovered = hoveredId === card.card_id && phase === "idle";

        const translateY =
          phase === "blank" || phase === "entering" ? "translate-y-[120vh]" :
          phase === "exiting" ? "-translate-y-[120vh]" :
          "translate-y-0";

        return (
          <button
            key={card.card_id}
            onClick={() => handlePick(card)}
            onMouseEnter={() => setHoveredId(card.card_id)}
            onMouseLeave={() => setHoveredId(null)}
            className={[
              "relative rounded-xl transition-all duration-500 ease-out",
              translateY,
              isHovered ? "scale-110" : "scale-100",
              isHovered ? "shadow-[0_0_40px_12px_rgba(255,255,255,0.6)]" : "",
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
  );
}
