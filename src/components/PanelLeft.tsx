import FilterButton from "@/components/FilterButton";
import { hasActiveFilters, type Filters } from "@/components/FilterModal";
import StreakLegend from "@/components/StreakLegend";

// Left column flanking the comparison area: the Filter trigger and the streak-color
// legend. Pure presentation — filter state lives in ComparisonScreen and is passed down.
// Hidden below md — the mobile toolbar area in ComparisonScreen carries the Filter
// trigger and a horizontal StreakLegend instead.
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

      <StreakLegend className="flex-col gap-2" />
    </aside>
  );
}
