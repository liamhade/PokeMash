import { STREAK_TIERS } from "@/lib/streak";

// Streak legend: which glow color maps to which win streak. Colors come from
// STREAK_TIERS (single source, shared with the card glow). Rendered in two places —
// PanelLeft on md+ and the phone toolbar area below md — so direction/spacing is the
// caller's concern via className (e.g. "flex-col gap-2" or "flex-row gap-3").
export default function StreakLegend({ className }: { className?: string }) {
  return (
    <ul className={`flex select-none ${className ?? ""}`}>
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
  );
}
