"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getPlayerId } from "@/lib/playerId";
import FilterModal, {
  EMPTY_FILTERS,
  hasActiveFilters,
  type Filters,
} from "@/components/FilterModal";
import FilterButton from "@/components/FilterButton";
import CardBack from "@/components/CardBack";
import { formatPrice, orDash, packName } from "@/lib/cardInfo";

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
  tcgplayer_product_id: number | null;
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

// Whose rankings the page shows: this player's own, the community's (every
// player's rating for a card averaged into one score), or a chosen friend's.
type Scope = "mine" | "universal" | "friend";

// A friend to pick from in the "Friend's Rankings" scope. Resolved the same way
// the /friends page does — friendship rows mapped to the other person's profile.
type Friend = { user_id: string; display_name: string };

// The card image dimensions; the flip container is locked to this so flipping to the
// detail table doesn't reflow the list. Sized a touch larger than the raw 220×305 (same
// ~0.72 aspect ratio, so the art isn't distorted) to fit the back's button + disclosure.
const CARD_WIDTH = 238;
const CARD_HEIGHT = 330;

// Hover this long before the wiggle hint fires (ms). One-shot per hover.
const WIGGLE_DELAY_MS = 6000;

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
    ["Price", formatPrice(card.market_price)],
  ];
  // Only universal-scope cards carry a rater count.
  if (card.raters !== undefined) {
    details.push(["Ranked by", `${card.raters} player${card.raters === 1 ? "" : "s"}`]);
  }

  return (
    <div className="flex items-center gap-6">
      {/* w-20 fits four digits (Space Mono at text-3xl needs ~73px) — the pool caps
          ranks at four digits, and w-12 let a 1,000+ rank spill into the card. */}
      <span className="w-20 text-right text-3xl font-bold text-neutral-400">
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
        className={["group cursor-pointer [perspective:1000px]", wiggling ? "wiggle" : ""].join(" ")}
      >
        <div
          className={[
            "relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]",
            flipped ? "[transform:rotateY(180deg)]" : "",
          ].join(" ")}
        >
          {/* Front: the card image, plus a corner button that loads this card into
              Play. A tiny target kept clear of the flip surface; faint at rest so it
              stays tappable on touch (where there's no hover) without competing with
              the art, brighter on hover. stopPropagation so loading isn't read as a
              flip; the ?seed lands the card on the compare board. */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <Image
              src={card.image_url}
              alt={card.name}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              className="rounded-xl shadow-md"
            />
            <Link
              href={`/compare?seed=${card.card_id}`}
              onClick={(event) => event.stopPropagation()}
              aria-label={`Compare ${card.name} in Play`}
              title="Compare in Play"
              className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600/90 text-white opacity-80 shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-red-600 group-hover:opacity-100"
            >
              {/* Crossed swords: "compare / head-to-head". */}
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14.5 17.5 4 6V3h3l11.5 12.5" />
                <path d="m13 19 6-6" />
                <path d="m16 16 4 4" />
                <path d="m19 21 2-2" />
                <path d="M9.5 17.5 20 6V3h-3L5.5 15.5" />
                <path d="m11 19-6-6" />
                <path d="m8 16-4 4" />
                <path d="m5 21-2-2" />
              </svg>
            </Link>
          </div>

          {/* Back: detail table + referral button, shared with the Play screen's flip. */}
          <CardBack
            details={details}
            buyName={card.name}
            buyProductId={card.tcgplayer_product_id}
            buyPack={card.pack}
            buyCardId={card.card_id}
          />
        </div>
      </div>
    </div>
  );
}

function RankingsScreen() {
  // ?player=<uuid> deep-links straight into a friend's list (linked from /friends).
  // Read once at mount to seed the scope + selection; after that the toggle and the
  // friend picker own the selection, so there's no live URL to keep in sync.
  const initialFriendId = useSearchParams().get("player");

  // Accumulated across "load more": null = first page still loading. meta holds the
  // personal progress counts (undefined under the universal scope, which sends none).
  const [cards, setCards] = useState<RankedCard[] | null>(null);
  const [meta, setMeta] = useState<{ comparedCount?: number; poolTotal?: number }>({});
  const [loadingMore, setLoadingMore] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  // Applied price/series filters (the eras/minElo fields stay unset — the modal here
  // only renders the price and series sections).
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [scope, setScope] = useState<Scope>(initialFriendId ? "friend" : "mine");

  // The picked friend (only meaningful under the "friend" scope) and the list of
  // friends to choose from. friends === null means "not loaded yet"; it's fetched
  // lazily the first time the friend scope is active.
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(initialFriendId);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const friendName = friends?.find((f) => f.user_id === selectedFriendId)?.display_name;

  // Name search: a collapsed icon button until opened. The ref mirrors the input so
  // fetchPage (and loadMore's later pages) read the current query without threading
  // it through every signature — the same ref pattern the compare screen's filters
  // use. Debounced so a fetch fires per pause in typing, not per keystroke.
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    async (
      applied: Filters,
      which: Scope,
      friend: string | null,
      page: number,
    ): Promise<RankingsResponse> => {
      // A friend's list fetches under their id; mine/universal under my own.
      const playerId = which === "friend" ? friend : await getPlayerId();
      if (!playerId) return { rankings: [] }; // friend scope with nobody picked yet
      const scopeParam = which === "universal" ? "&scope=universal" : "";
      const q = searchRef.current.trim();
      const searchParam = q ? `&q=${encodeURIComponent(q)}` : "";
      return fetch(
        `/api/rankings?playerId=${playerId}${scopeParam}&page=${page}${filterQuery(applied)}${searchParam}`,
      ).then((res) => res.json());
    },
    [filterQuery],
  );

  // Load page 0 fresh — used on mount and whenever the filter, scope, or friend changes.
  const loadFirstPage = useCallback(
    (applied: Filters, which: Scope, friend: string | null) => {
      const token = ++requestRef.current;
      pageRef.current = 0;
      setCards(null); // show the loading state while the new list arrives
      fetchPage(applied, which, friend, 0).then((data) => {
        if (requestRef.current !== token) return; // superseded by a newer load
        setCards(data.rankings ?? []);
        setMeta({ comparedCount: data.comparedCount, poolTotal: data.poolTotal });
      });
    },
    [fetchPage],
  );

  // Append the next page to the current list (personal + friend scopes only).
  const loadMore = useCallback(() => {
    const token = requestRef.current; // not bumped: same list session
    const next = pageRef.current + 1;
    setLoadingMore(true);
    fetchPage(filters, scope, selectedFriendId, next).then((data) => {
      setLoadingMore(false);
      if (requestRef.current !== token) return; // filter/scope changed mid-load
      pageRef.current = next;
      setCards((prev) => [...(prev ?? []), ...(data.rankings ?? [])]);
    });
  }, [fetchPage, filters, scope, selectedFriendId]);

  // Load the friend list (the picker's options) — replicates the /friends page's
  // resolution: friendship rows → the other person's id → their profile. RLS
  // returns nothing when signed out, so friends ends up an empty list.
  const loadFriends = useCallback(async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return setFriends([]);
    const { data: rows } = await supabase.from("friendships").select("user_a, user_b");
    const ids = (rows ?? []).map((row) => (row.user_a === uid ? row.user_b : row.user_a));
    if (ids.length === 0) return setFriends([]);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", ids)
      .order("display_name");
    setFriends((data as Friend[]) ?? []);
  }, []);

  useEffect(() => {
    // The mount fetch clears cards synchronously (loading state); intentional here, so
    // silence the set-state-in-effect rule like the compare screen's mount effect does.
    // A friend deep-link (?player=) lands in friend scope and loads that friend directly.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFirstPage(filters, scope, selectedFriendId);
    // Only run on mount; filter/scope/friend changes refetch explicitly in their handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch the picker's options the first time the friend scope is active. loadFriends
  // only setState()s after awaiting Supabase, so the synchronous-cascade rule doesn't
  // truly apply (same suppression the mount effect above uses).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (scope === "friend" && friends === null) loadFriends();
  }, [scope, friends, loadFriends]);

  // Type → wait for a pause → reload page 0 under the new query. The list keeps
  // showing the previous results until the fresh page lands (loadFirstPage clears it).
  function handleSearchChange(value: string) {
    setSearch(value);
    searchRef.current = value;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(
      () => loadFirstPage(filters, scope, selectedFriendId),
      300,
    );
  }

  // Collapse back to the icon; if a query was active, drop it and reload unfiltered.
  function closeSearch() {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const hadQuery = searchRef.current.trim() !== "";
    setSearchOpen(false);
    setSearch("");
    searchRef.current = "";
    if (hadQuery) loadFirstPage(filters, scope, selectedFriendId);
  }

  // More pages remain when we've loaded fewer cards than the player's total ranks.
  // Universal sends no comparedCount, so its list never shows "load more" (capped at 100).
  const hasMore =
    cards !== null && meta.comparedCount !== undefined && cards.length < meta.comparedCount;

  return (
    <div className="flex flex-1 flex-col">
      {/* Toolbar. On phones the full-size row is wider than the screen, so it
          steps down: controls spread edge-to-edge (justify-between) instead of
          left-clustering, and flex-wrap lets the opened search drop to its own
          full-width line rather than squeezing into the leftover sliver. */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 md:justify-start md:gap-4 md:px-6 md:py-4">
        <div className="relative">
          <FilterButton onClick={() => setFilterOpen(true)} />
          {hasActiveFilters(filters) && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white"
            />
          )}
        </div>

        {/* Scope toggle: my list, the community-average leaderboard, or a friend's.
            Phones get shorter labels and smaller text — the full wording alone is
            wider than a phone screen. */}
        <div className="flex rounded-full border border-neutral-300 p-0.5 text-xs md:text-sm font-medium">
          {(
            [
              { value: "mine", label: "My Rankings", shortLabel: "Mine" },
              { value: "universal", label: "Universal", shortLabel: "Universal" },
              { value: "friend", label: "Friend's Rankings", shortLabel: "Friends" },
            ] as { value: Scope; label: string; shortLabel: string }[]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                if (option.value === scope) return;
                setScope(option.value);
                // Friend scope waits for a pick unless one's already chosen; the
                // other scopes load right away.
                if (option.value === "friend") {
                  if (selectedFriendId) loadFirstPage(filters, "friend", selectedFriendId);
                  else setCards(null);
                } else {
                  loadFirstPage(filters, option.value, null);
                }
              }}
              className={[
                "rounded-full px-2 md:px-3 py-1 transition-colors",
                option.value === scope
                  ? "bg-red-600 text-white"
                  : "text-neutral-600 hover:text-neutral-900",
              ].join(" ")}
            >
              <span className="md:hidden">{option.shortLabel}</span>
              <span className="hidden md:inline">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Name search: an icon until it's needed, an inline pill input while open.
            Esc or the × collapses it (clearing any active query). */}
        {searchOpen ? (
          // w-full below md: flex-wrap drops the open search onto its own line,
          // where the input can fill the screen width instead of a cramped sliver.
          <div className="flex w-full items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 md:w-auto">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-neutral-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16" y2="16" />
            </svg>
            <input
              autoFocus
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") closeSearch();
              }}
              placeholder="Search cards"
              aria-label="Search cards by name"
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 md:w-40 md:flex-none"
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="text-neutral-400 transition-colors hover:text-neutral-700"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search cards by name"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-800"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16" y2="16" />
            </svg>
          </button>
        )}

        {/* Friend picker - only in friend scope, and only once there are friends
            to choose from (otherwise the empty-state message below points to /friends). */}
        {scope === "friend" && friends && friends.length > 0 && (
          <select
            value={selectedFriendId ?? ""}
            onChange={(event) => {
              const id = event.target.value || null;
              setSelectedFriendId(id);
              if (id) loadFirstPage(filters, "friend", id);
            }}
            className="rounded-full border border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-700 outline-none transition-colors hover:border-neutral-400"
          >
            <option value="" disabled>
              Select a friend
            </option>
            {friends.map((friend) => (
              <option key={friend.user_id} value={friend.user_id}>
                {friend.display_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {scope === "friend" && !selectedFriendId ? (
        <p className="py-20 text-center text-neutral-500">
          {friends === null ? (
            "Loading…"
          ) : friends.length === 0 ? (
            <>
              You haven&apos;t added any friends yet.{" "}
              <Link href="/friends" className="text-red-600 hover:underline">
                Add friends
              </Link>{" "}
              to see their rankings.
            </>
          ) : (
            "Choose a friend above to see their rankings."
          )}
        </p>
      ) : !cards ? (
        <p className="py-20 text-center text-neutral-500">Loading rankings…</p>
      ) : (
        <>
          {/* Scrollable list, highest ranked at the top, each card centered. */}
          <div className="flex flex-1 flex-col items-center gap-8 overflow-y-auto px-4 py-10">
            {cards.length === 0 ? (
              <p className="text-neutral-500">
                {search.trim()
                  ? "No ranked cards match your search."
                  : scope === "friend"
                    ? "No rankings here yet — they haven't compared any cards."
                    : scope === "universal"
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
              {scope === "friend" ? `${friendName ?? "Your friend"} has` : "You've"} compared{" "}
              {meta.comparedCount.toLocaleString("en-US")}
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
            loadFirstPage(applied, scope, selectedFriendId);
          }}
        />
      )}
    </div>
  );
}

// useSearchParams (the ?player= friend view) must sit under a Suspense
// boundary or Next fails the page's prerender.
export default function RankingsPage() {
  return (
    <Suspense>
      <RankingsScreen />
    </Suspense>
  );
}
