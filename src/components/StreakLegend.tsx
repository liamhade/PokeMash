import { STREAK_TIERS } from "@/lib/streak";

// Streak legend: which glow color maps to which win streak. Colors come from
// STREAK_TIERS (single source, shared with the card glow). Rendered in two places —
// PanelLeft on md+ and the phone toolbar area below md — so direction/spacing is the
// caller's concern via className (e.g. "flex-col gap-2" or "flex-row gap-3").
// It earns screen space only while a glow is actually showing (`visible`): kept
// mounted and faded via opacity so appearing never reflows the layout around it.
export default function StreakLegend({
  visible,
  className,
}: {
  visible: boolean;
  className?: string;
}) {
  return (
    <ul
      aria-hidden={!visible}
      className={[
        "flex select-none transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0",
        className ?? "",
      ].join(" ")}
    >
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
