import FilterButton from "@/components/FilterButton";
import { hasActiveFilters, type Filters } from "@/components/FilterModal";
import { STREAK_TIERS } from "@/lib/streak";

// Left column flanking the comparison area: the Filter trigger and the streak-color
// legend. Pure presentation — filter state lives in ComparisonScreen and is passed down.
// Hidden below md — the mobile toolbar in ComparisonScreen carries the Filter trigger
// instead (the legend is desktop-only).
type PanelLeftProps = {
  filters: Filters;
  onOpenFilter: () => void;
};

export default function PanelLeft({ filters, onOpenFilter }: PanelLeftProps) {
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col items-start gap-8 px-6 py-4">
      {/* Filter trigger. A dot badges it when any price/era/series filter is active. */}
      <div className="relative">
        <FilterButton onClick={onOpenFilter} />
        {hasActiveFilters(filters) && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-600 ring-2 ring-white"
          />
        )}
      </div>

      {/* Streak legend: which glow color maps to which win streak. Colors come from
          STREAK_TIERS (single source, shared with the card glow). */}
      <ul className="flex flex-col gap-2 select-none">
        {STREAK_TIERS.map((tier) => (
          <li key={tier.streak} className="flex items-center gap-2 text-xs text-neutral-500">
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: `rgb(${tier.color})`,
                boxShadow: `0 0 6px 1px rgb(${tier.color} / 0.7)`,
              }}
            />
            <span className="tabular-nums">{tier.streak}+</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
