import { STREAK_TIERS } from "@/lib/streak";

// Streak legend: which glow color maps to which win streak. Colors come from
// STREAK_TIERS (single source, shared with the card glow). Rendered in two places —
// PanelLeft on md+ and the phone toolbar area below md — so direction/spacing is the
// caller's concern via className (e.g. "flex-col gap-2" or "flex-row gap-3").
// Tiers roll out one by one: each row slides in as the streak REACHES it (so the
// legend narrates the run — 5+ appears at five wins, 10+ at ten…), and the whole
// thing vanishes when the streak breaks. Rows stay mounted and animate via
// opacity/transform so appearing never reflows the layout around them.
export default function StreakLegend({
  streak,
  className,
}: {
  streak: number;
  className?: string;
}) {
  return (
    <ul
      aria-hidden={streak < STREAK_TIERS[0].streak}
      className={`flex select-none ${className ?? ""}`}
    >
      {STREAK_TIERS.map((tier) => {
        const reached = streak >= tier.streak;
        return (
          <li
            key={tier.streak}
            className={[
              "flex items-center gap-2 text-xs text-neutral-500",
              "transition-all duration-500",
              reached ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
            ].join(" ")}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: `rgb(${tier.color})`,
                boxShadow: `0 0 6px 1px rgb(${tier.color} / 0.7)`,
              }}
            />
            <span className="tabular-nums">{tier.streak}+</span>
          </li>
        );
      })}
    </ul>
  );
}
