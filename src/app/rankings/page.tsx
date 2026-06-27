"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPlayerId } from "@/lib/playerId";

type RankedCard = {
  rank: number;
  card_id: string;
  name: string;
  image_url: string;
  r: number;
};

type RankingsResponse = {
  rankings: RankedCard[];
  comparedCount: number;
  totalCards: number;
};

export default function RankingsPage() {
  const [data, setData] = useState<RankingsResponse | null>(null);

  useEffect(() => {
    const playerId = getPlayerId();
    fetch(`/api/rankings?playerId=${playerId}`)
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) {
    return <p className="py-20 text-center text-neutral-500">Loading your rankings…</p>;
  }

  const percent =
    data.totalCards > 0 ? Math.round((data.comparedCount / data.totalCards) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* Scrollable list, highest ranked at the top, each card centered. */}
      <div className="flex flex-1 flex-col items-center gap-8 overflow-y-auto px-4 py-10">
        {data.rankings.length === 0 ? (
          <p className="text-neutral-500">No rankings yet — head to Play to start comparing!</p>
        ) : (
          data.rankings.map((card) => (
            <div key={card.card_id} className="flex items-center gap-6">
              <span className="w-12 text-right text-3xl font-bold text-neutral-400">
                {card.rank}
              </span>
              <Image
                src={card.image_url}
                alt={card.name}
                width={220}
                height={305}
                className="rounded-xl shadow-md"
              />
            </div>
          ))
        )}
      </div>

      {/* Progress meter pinned to the bottom of the screen. */}
      <div className="sticky bottom-0 border-t border-neutral-200 bg-white py-4 text-center font-semibold text-neutral-800 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        You&apos;ve compared {data.comparedCount} out of {data.totalCards} cards ({percent}%)!
      </div>
    </div>
  );
}
