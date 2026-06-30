"use client";

import { useState } from "react";

// The filter selections this modal edits and hands back on Apply. minPrice/maxPrice are
// raw input strings ("" = unset); eras/series hold the chosen values.
export type Filters = {
  minPrice: string;
  maxPrice: string;
  eras: string[];
  series: string[];
};

export const EMPTY_FILTERS: Filters = { minPrice: "", maxPrice: "", eras: [], series: [] };

// True when any filter is active — used by the caller to badge the Filter button.
export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.eras.length > 0 ||
    filters.series.length > 0
  );
}

// Era buckets. Values match the API's ERA_YEAR_RANGES keys; hints describe the year span.
// Hints use explicit start–end years (not a "≤" glyph, which rendered oversized).
const ERAS = [
  { value: "vintage", label: "Vintage", hint: "1999–2007" },
  { value: "middle", label: "Middle", hint: "2008–2016" },
  { value: "modern", label: "Modern", hint: "2017+" },
];

// The distinct `cards.set` (series) values, newest era first. Static list because
// PostgREST can't SELECT DISTINCT without an RPC; regenerate when the catalog gains a
// new series (keep in sync with the API's ERA_SETS).
const SERIES = [
  "Mega Evolution", "Scarlet & Violet", "Sword & Shield", "Sun & Moon", "XY",
  "Black & White", "HeartGold & SoulSilver", "Platinum", "Diamond & Pearl", "EX",
  "E-Card", "Neo", "Gym", "Classic", "Promos", "POP", "Collections",
  "Other",
];

type Props = {
  // Seeds the working selection so reopening restores the applied state.
  initial: Filters;
  onApply: (filters: Filters) => void;
  // Cancel path shared by the × button and clicking outside the panel.
  onClose: () => void;
};

// Mounted only while open (the parent controls this), so the working state below starts
// fresh from `initial` on every open and edits are discarded on cancel.
export default function FilterModal({ initial, onApply, onClose }: Props) {
  const [minPrice, setMinPrice] = useState(initial.minPrice);
  const [maxPrice, setMaxPrice] = useState(initial.maxPrice);
  const [eras, setEras] = useState<Set<string>>(() => new Set(initial.eras));
  const [series, setSeries] = useState<Set<string>>(() => new Set(initial.series));
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesOpen, setSeriesOpen] = useState(false);

  function toggle(current: Set<string>, value: string): Set<string> {
    const next = new Set(current);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  }

  const visibleSeries = SERIES.filter((name) =>
    name.toLowerCase().includes(seriesSearch.toLowerCase()),
  );

  function clearAll() {
    setMinPrice("");
    setMaxPrice("");
    setEras(new Set());
    setSeries(new Set());
  }

  function apply() {
    onApply({
      minPrice: minPrice.trim(),
      maxPrice: maxPrice.trim(),
      eras: [...eras],
      series: [...series],
    });
  }

  return (
    <div
      // Click-outside the panel cancels, same as the × button.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-neutral-700"
        >
          <span className="text-2xl leading-none">&times;</span>
        </button>

        <h2 className="mb-4 text-lg font-semibold text-neutral-800">Filter cards</h2>

        {/* Price range (market price, USD) */}
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Price (USD)</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Min"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-800 outline-none focus:border-red-500"
            />
            <span className="text-neutral-400">–</span>
            <input
              type="number"
              min="0"
              inputMode="decimal"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Max"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-800 outline-none focus:border-red-500"
            />
          </div>
        </section>

        {/* Era — multi-select toggle chips */}
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Era</h3>
          <div className="flex flex-wrap gap-2">
            {ERAS.map((era) => {
              const on = eras.has(era.value);
              return (
                <button
                  key={era.value}
                  type="button"
                  onClick={() => setEras((prev) => toggle(prev, era.value))}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    on
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-neutral-300 text-neutral-700 hover:border-neutral-400",
                  ].join(" ")}
                >
                  {era.label}
                  <span className="ml-1 text-xs opacity-70">{era.hint}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Series — searchable multi-select */}
        <section className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Series</h3>

          {/* applied_filter area: a removable chip per selected series. */}
          {series.size > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {[...series].map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => setSeries((prev) => toggle(prev, name))}
                    aria-label={`Remove ${name}`}
                    className="text-red-500 hover:text-red-800"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            type="text"
            value={seriesSearch}
            onChange={(event) => setSeriesSearch(event.target.value)}
            onFocus={() => setSeriesOpen(true)}
            placeholder="Search series..."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-800 outline-none focus:border-red-500"
          />

          {seriesOpen && (
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-neutral-200">
              {visibleSeries.map((name) => {
                const isSelected = series.has(name);
                return (
                  <li key={name}>
                    <label
                      className={[
                        "flex cursor-pointer select-none items-center gap-3 px-3 py-2",
                        isSelected ? "bg-red-50" : "hover:bg-neutral-50",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSeries((prev) => toggle(prev, name))}
                        className="h-4 w-4 accent-red-600"
                      />
                      <span className="text-neutral-800">{name}</span>
                    </label>
                  </li>
                );
              })}
              {visibleSeries.length === 0 && (
                <li className="px-3 py-2 text-sm text-neutral-400">No matches</li>
              )}
            </ul>
          )}
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={apply}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg px-4 py-2 font-medium text-neutral-500 transition-colors hover:text-neutral-800"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
