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
import CardBack from "@/components/CardBack";
import { orDash, packName } from "@/lib/cardInfo";

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

// comparedCount drives the personal progress meter; the universal response omits
// it (community progress isn't "yours"), so it's optional. poolTotal is the true
// eligible-pool size (counted in JS server-side, since the eligibility rules can't
// run in the DB) under the same filters — the honest denominator for a percentage.
type RankingsResponse = {
  rankings: RankedCard[];
  comparedCount?: number;
  poolTotal?: number;
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

// market_price is 0 when there's no sales data; treat that (and null) as "no price".
function formatPrice(price: number | null): string {
  return price ? `$${price.toFixed(2)}` : "—";
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

          {/* Back: detail table + referral button, shared with the Play screen's flip. */}
          <CardBack details={details} buyName={card.name} />
        </div>
      </div>
    </div>
  );
}

export default function RankingsPage() {
  // Accumulated across "load more": null = first page still loading. meta holds the
  // personal progress counts (undefined under the universal scope, which sends none).
  const [cards, setCards] = useState<RankedCard[] | null>(null);
  const [meta, setMeta] = useState<{ comparedCount?: number; poolTotal?: number }>({});
  const [loadingMore, setLoadingMore] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  // Applied price/series filters (the eras/minElo fields stay unset — the modal here
  // only renders the price and series sections).
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [scope, setScope] = useState<Scope>("mine");

  // The last page index loaded, and a token that invalidates in-flight fetches when
  // the filter/scope changes — so a slow "load more" can't append to a newer list.
  const pageRef = useRef(0);
  const requestRef = useRef(0);

  // Price/series query params for the applied filters; "" when none are set.
  const filterQuery = useCallback((applied: Filters) => {
    const query = new URLSearchParams();
    if (applied.series.length) query.set("series", applied.series.join(","));
    if (applied.minPrice) query.set("minPrice", applied.minPrice);
    if (applied.maxPrice) query.set("maxPrice", applied.maxPrice);
    const chunk = query.toString();
    return chunk ? `&${chunk}` : "";
  }, []);

  const fetchPage = useCallback(
    (applied: Filters, which: Scope, page: number): Promise<RankingsResponse> => {
      const playerId = getPlayerId();
      const scopeParam = which === "universal" ? "&scope=universal" : "";
      return fetch(
        `/api/rankings?playerId=${playerId}${scopeParam}&page=${page}${filterQuery(applied)}`,
      ).then((res) => res.json());
    },
    [filterQuery],
  );

  // Load page 0 fresh — used on mount and whenever the filter or scope changes.
  const loadFirstPage = useCallback(
    (applied: Filters, which: Scope) => {
      const token = ++requestRef.current;
      pageRef.current = 0;
      setCards(null); // show the loading state while the new list arrives
      fetchPage(applied, which, 0).then((data) => {
        if (requestRef.current !== token) return; // superseded by a newer load
        setCards(data.rankings ?? []);
        setMeta({ comparedCount: data.comparedCount, poolTotal: data.poolTotal });
      });
    },
    [fetchPage],
  );

  // Append the next page to the current list (personal scope only).
  const loadMore = useCallback(() => {
    const token = requestRef.current; // not bumped: same list session
    const next = pageRef.current + 1;
    setLoadingMore(true);
    fetchPage(filters, scope, next).then((data) => {
      setLoadingMore(false);
      if (requestRef.current !== token) return; // filter/scope changed mid-load
      pageRef.current = next;
      setCards((prev) => [...(prev ?? []), ...(data.rankings ?? [])]);
    });
  }, [fetchPage, filters, scope]);

  useEffect(() => {
    // The mount fetch clears cards synchronously (loading state); intentional here, so
    // silence the set-state-in-effect rule like the compare screen's mount effect does.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage(filters, scope);
    // Only run on mount; filter/scope changes refetch explicitly in their handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // More pages remain when we've loaded fewer cards than the player's total ranks.
  // Universal sends no comparedCount, so its list never shows "load more" (capped at 100).
  const hasMore =
    cards !== null && meta.comparedCount !== undefined && cards.length < meta.comparedCount;

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
                loadFirstPage(filters, option.value);
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

      {!cards ? (
        <p className="py-20 text-center text-neutral-500">Loading your rankings…</p>
      ) : (
        <>
          {/* Scrollable list, highest ranked at the top, each card centered. */}
          <div className="flex flex-1 flex-col items-center gap-8 overflow-y-auto px-4 py-10">
            {cards.length === 0 ? (
              <p className="text-neutral-500">
                {scope === "universal"
                  ? "No community rankings yet — be the first to compare some cards!"
                  : "No rankings yet — head to Play to start comparing!"}
              </p>
            ) : (
              cards.map((card) => <RankingCard key={card.card_id} card={card} />)
            )}

            {/* Reveal the next page rather than rendering thousands of cards at once. */}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-full border border-neutral-300 px-6 py-2 font-medium text-neutral-700 transition-colors hover:border-neutral-400 disabled:opacity-50"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>

          {/* Progress meter pinned to the bottom of the screen. Personal progress
              only — the universal response carries no compared count. The percentage
              is against poolTotal, the JS-counted eligible pool (NOT the raw table
              count, which the eligibility rules make unreachable). Capped at 100:
              cards rated before a pool-rule tightening can exceed today's pool. */}
          {meta.comparedCount !== undefined && (
            <div className="sticky bottom-0 border-t border-neutral-200 bg-white py-4 text-center font-semibold text-neutral-800 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
              You&apos;ve compared {meta.comparedCount.toLocaleString("en-US")}
              {meta.poolTotal
                ? ` of ${meta.poolTotal.toLocaleString("en-US")} cards (${Math.min(100, Math.round((meta.comparedCount / meta.poolTotal) * 100))}%)`
                : " cards"}
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
            loadFirstPage(applied, scope);
          }}
        />
      )}
    </div>
  );
}
