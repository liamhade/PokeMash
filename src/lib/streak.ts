// Winning-streak glow tiers, ascending. Each maps a streak threshold to its glow color
// (an "R G B" triple). Single source of truth shared by the card glow in ComparisonArea
// and the legend in PlayInfoPanel.
export const STREAK_TIERS = [
  { streak: 5, color: "220 38 38" }, // red
  { streak: 10, color: "249 115 22" }, // orange
  { streak: 20, color: "37 99 235" }, // blue
  { streak: 40, color: "139 92 246" }, // violet
];

// Highest tier the streak has reached → its glow color; null below the first tier.
export function flameColor(streak: number): string | null {
  let color: string | null = null;
  for (const tier of STREAK_TIERS) {
    if (streak >= tier.streak) color = tier.color;
  }
  return color;
}
