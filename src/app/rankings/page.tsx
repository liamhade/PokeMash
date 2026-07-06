"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getPlayerId } from "@/lib/playerId";
import FilterModal, {
  EMPTY_FILTERS,
  hasActiveFilters,
  type Filters,
} from "@/components/FilterModal";
import FilterButton from "@/components/FilterButton";

type RankedCard = {
  rank: number;
  card_id: string;
  name: string;
  image_url: string;
  r: number;
  // Universal scope only: how many players' ratings the community score averages.
  raters?: number;
  set: string | null;
  pack: string | null;
  release_date: string | null;
  collector_number: string | null;
  market_price: number | null;
};

// comparedCount/totalCards drive the personal progress meter; the universal
// response omits them (community progress isn't "yours"), so they're optional.
type RankingsResponse = {
  rankings: RankedCard[];
  comparedCount?: number;
  totalCards?: number;
};

// Whose rankings the page shows: this player's own, or the community's — every
// player's rating for a card averaged into one score.
type Scope = "mine" | "universal";

// The card image dimensions; the flip container is locked to this so flipping to the
// detail table doesn't reflow the list. Sized a touch larger than the raw 220×305 (same
// ~0.72 aspect ratio, so the art isn't distorted) to fit the back's button + disclosure.
const CARD_WIDTH = 238;
const CARD_HEIGHT = 330;

// Hover this long before the wiggle hint fires (ms). One-shot per hover.
const WIGGLE_DELAY_MS = 6000;

// A non-empty text value, or an em dash for null/blank so the detail rows read cleanly.
function orDash(value: string | null): string {
  return value && value.trim() ? value : "—";
}

// market_price is 0 when there's no sales data; treat that (and null) as "no price".
function formatPrice(price: number | null): string {
  return price ? `$${price.toFixed(2)}` : "—";
}

// Pack values carry a trailing abbreviation, e.g. "Base Set (BS)"; drop it for display.
function packName(pack: string | null): string {
  return orDash(pack ? pack.replace(/\s*\([^)]*\)\s*$/, "") : null);
}

// Placeholder referral link — a TCGplayer name search for now. Swap to an affiliate
// product link (partner code + tcgplayer_product_id) once those are backfilled.
function tcgplayerSearchUrl(name: string): string {
  return `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(name)}`;
}

// One ranked card: click to flip between the image and a details table, and — as a hint
// that it's interactive — it wiggles once after the pointer has rested on it a while.
// Owns its own flip/wiggle state so the list parent doesn't juggle per-card timers.
function RankingCard({ card }: { card: RankedCard }) {
  const [flipped, setFlipped] = useState(false);
  const [wiggling, setWiggling] = useState(false);
  const wiggleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arm a single timer on enter (never re-armed while hovering), so the wiggle fires at
  // most once per hover; leaving clears it, and re-entering arms a fresh one.
  function handleMouseEnter() {
    wiggleTimer.current = setTimeout(() => setWiggling(true), WIGGLE_DELAY_MS);
  }
  function handleMouseLeave() {
    if (wiggleTimer.current) clearTimeout(wiggleTimer.current);
    wiggleTimer.current = null;
    setWiggling(false);
  }

  // Clear a pending timer if the card unmounts (e.g. a filter refetch) so it can't fire
  // against a gone component.
  useEffect(
    () => () => {
      if (wiggleTimer.current) clearTimeout(wiggleTimer.current);
    },
    [],
  );

  const details: [string, string][] = [
    ["Name", orDash(card.name)],
    ["Set", orDash(card.set)],
    ["Pack", packName(card.pack)],
    ["Released", orDash(card.release_date)],
    ["Market Price", formatPrice(card.market_price)],
  ];
  // Only universal-scope cards carry a rater count.
  if (card.raters !== undefined) {
    details.push(["Ranked by", `${card.raters} player${card.raters === 1 ? "" : "s"}`]);
  }

  return (
    <div className="flex items-center gap-6">
      <span className="w-12 text-right text-3xl font-bold text-neutral-400">
        {card.rank}
      </span>
      {/* Flip toggle. A role=button div (not a <button>) so the back face's referral <a>
          isn't an invalid interactive-in-interactive nesting. Wiggle lives here; the flip's
          rotateY lives on the inner element so the two transforms don't fight. */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        onClick={() => setFlipped((on) => !on)}
        onKeyDown={(event) => {
          // Ignore keys from the inner link so activating "Buy" doesn't also flip the card.
          if (event.currentTarget !== event.target) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setFlipped((on) => !on);
          }
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onAnimationEnd={() => setWiggling(false)}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
        className={["cursor-pointer [perspective:1000px]", wiggling ? "wiggle" : ""].join(" ")}
      >
        <div
          className={[
            "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
            flipped ? "[transform:rotateY(180deg)]" : "",
          ].join(" ")}
        >
          {/* Front: the card image. */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <Image
              src={card.image_url}
              alt={card.name}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              className="rounded-xl shadow-md"
            />
          </div>

          {/* Back: detail table + a placeholder TCGplayer referral button. Rows use tight
              padding so the table and button both fit without enlarging the card. */}
          <div className="absolute inset-0 flex flex-col justify-center gap-2 rounded-xl bg-white p-4 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <table className="w-full text-sm">
              <tbody>
                {details.map(([label, value]) => (
                  <tr
                    key={label}
                    className="border-b border-neutral-100 last:border-0"
                  >
                    <td className="py-2 pr-2 font-semibold text-neutral-500">
                      {label}
                    </td>
                    <td className="py-2 text-right break-words text-neutral-800">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Placeholder referral link (name search until the affiliate product link
                lands). stopPropagation so a buy click doesn't also flip the card back. */}
            <a
              href={tcgplayerSearchUrl(card.name)}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={(event) => event.stopPropagation()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Buy on TCGplayer
            </a>

            {/* FTC affiliate disclosure — required wherever a referral link appears. */}
            <span className="text-center text-[9px] leading-tight text-neutral-400">
              As a TCGplayer affiliate, PokeMash earns from qualifying purchases.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RankingsPage() {
  const [data, setData] = useState<RankingsResponse | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  // Applied price/series filters (the eras/minElo fields stay unset — the modal here
  // only renders the price and series sections).
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [scope, setScope] = useState<Scope>("mine");

  // Price/series query params for the applied filters; "" when none are set.
  const filterQuery = useCallback((applied: Filters) => {
    const query = new URLSearchParams();
    if (applied.series.length) query.set("series", applied.series.join(","));
    if (applied.minPrice) query.set("minPrice", applied.minPrice);
    if (applied.maxPrice) query.set("maxPrice", applied.maxPrice);
    const chunk = query.toString();
    return chunk ? `&${chunk}` : "";
  }, []);

  const loadRankings = useCallback(
    (applied: Filters, which: Scope) => {
      // Clear so the loading state shows while the filtered list is refetched.
      setData(null);
      const playerId = getPlayerId();
      const scopeParam = which === "universal" ? "&scope=universal" : "";
      fetch(`/api/rankings?playerId=${playerId}${scopeParam}${filterQuery(applied)}`)
        .then((res) => res.json())
        .then(setData);
    },
    [filterQuery],
  );

  useEffect(() => {
    // The mount fetch clears data synchronously (loading state); intentional here, so
    // silence the set-state-in-effect rule like the compare screen's mount effect does.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRankings(filters, scope);
    // Only run on mount; filter/scope changes refetch explicitly in their handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="relative">
          <FilterButton onClick={() => setFilterOpen(true)} />
          {hasActiveFilters(filters) && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white"
            />
          )}
        </div>

        {/* Scope toggle: this player's list vs. the community-average leaderboard. */}
        <div className="flex rounded-full border border-neutral-300 p-0.5 text-sm font-medium">
          {(
            [
              { value: "mine", label: "My Rankings" },
              { value: "universal", label: "Universal" },
            ] as { value: Scope; label: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (option.value === scope) return;
                setScope(option.value);
                loadRankings(filters, option.value);
              }}
              className={[
                "rounded-full px-3 py-1 transition-colors",
                option.value === scope
                  ? "bg-red-600 text-white"
                  : "text-neutral-600 hover:text-neutral-900",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!data ? (
        <p className="py-20 text-center text-neutral-500">Loading your rankings…</p>
      ) : (
        <>
          {/* Scrollable list, highest ranked at the top, each card centered. */}
          <div className="flex flex-1 flex-col items-center gap-8 overflow-y-auto px-4 py-10">
            {data.rankings.length === 0 ? (
              <p className="text-neutral-500">
                {scope === "universal"
                  ? "No community rankings yet — be the first to compare some cards!"
                  : "No rankings yet — head to Play to start comparing!"}
              </p>
            ) : (
              data.rankings.map((card) => (
                <RankingCard key={card.card_id} card={card} />
              ))
            )}
          </div>

          {/* Progress meter pinned to the bottom of the screen. Personal progress
              only — the universal response carries no compared/total counts. */}
          {data.comparedCount !== undefined && data.totalCards !== undefined && (
            <div className="sticky bottom-0 border-t border-neutral-200 bg-white py-4 text-center font-semibold text-neutral-800 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
              You&apos;ve compared {data.comparedCount} out of {data.totalCards} cards (
              {data.totalCards > 0
                ? Math.round((data.comparedCount / data.totalCards) * 100)
                : 0}
              %)!
            </div>
          )}
        </>
      )}

      {/* Mounted only while open so its working state resets from `filters` each time.
          Rankings filters on price and series only, so the other sections are hidden. */}
      {filterOpen && (
        <FilterModal
          initial={filters}
          sections={["price", "series"]}
          onClose={() => setFilterOpen(false)}
          onApply={(applied) => {
            setFilters(applied);
            setFilterOpen(false);
            loadRankings(applied, scope);
          }}
        />
      )}
    </div>
  );
}
