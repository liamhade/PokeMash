"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { getPlayerId } from "@/lib/playerId";
import RarityFilterModal from "@/components/RarityFilterModal";

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

  const [filterOpen, setFilterOpen] = useState(false);
  // Applied rarity filters and the full list shown in the modal dropdown.
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [availableRarities, setAvailableRarities] = useState<string[]>([]);

  // Repeatable ?rarity= params for the applied filters; "" when none are set.
  const rarityQuery = useCallback(
    (rarities: string[]) =>
      rarities.map((rarity) => `&rarity=${encodeURIComponent(rarity)}`).join(""),
    [],
  );

  const loadRankings = useCallback(
    (rarities: string[]) => {
      // Clear so the loading state shows while the filtered list is refetched.
      setData(null);
      const playerId = getPlayerId();
      fetch(`/api/rankings?playerId=${playerId}${rarityQuery(rarities)}`)
        .then((res) => res.json())
        .then(setData);
    },
    [rarityQuery],
  );

  useEffect(() => {
    loadRankings(selectedRarities);
    // Only run on mount; filter changes refetch explicitly in onApply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazily load the rarity values the first time the modal opens — users who
  // never filter never pay for the request.
  async function openFilter() {
    if (availableRarities.length === 0) {
      const res = await fetch("/api/filters/rarity");
      const { rarities } = (await res.json()) as { rarities: string[] };
      setAvailableRarities(rarities);
    }
    setFilterOpen(true);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex px-6 py-4">
        <button
          type="button"
          onClick={openFilter}
          className="rounded-full bg-neutral-100 px-5 py-2 font-semibold text-neutral-800 transition-colors hover:bg-neutral-200"
        >
          Filter
        </button>
      </div>

      {!data ? (
        <p className="py-20 text-center text-neutral-500">Loading your rankings…</p>
      ) : (
        <>
          {/* Scrollable list, highest ranked at the top, each card centered. */}
          <div className="flex flex-1 flex-col items-center gap-8 overflow-y-auto px-4 py-10">
            {data.rankings.length === 0 ? (
              <p className="text-neutral-500">
                No rankings yet — head to Play to start comparing!
              </p>
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
            You&apos;ve compared {data.comparedCount} out of {data.totalCards} cards (
            {data.totalCards > 0
              ? Math.round((data.comparedCount / data.totalCards) * 100)
              : 0}
            %)!
          </div>
        </>
      )}

      {filterOpen && (
        <RarityFilterModal
          rarities={availableRarities}
          initialSelected={selectedRarities}
          onClose={() => setFilterOpen(false)}
          onApply={(rarities) => {
            setSelectedRarities(rarities);
            setFilterOpen(false);
            loadRankings(rarities);
          }}
        />
      )}
    </div>
  );
}
