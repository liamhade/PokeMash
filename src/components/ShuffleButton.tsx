// "Shuffle" control for Play: throws the whole board away for a fresh random pair —
// no pick, no rating change. Icon-only (crossing arrows), sits beside the undo button
// under the pair. Disabled while the board is mid-animation.
type ShuffleButtonProps = {
  onShuffle: () => void;
  disabled: boolean;
  className?: string;
};

export default function ShuffleButton({ onShuffle, disabled, className }: ShuffleButtonProps) {
  return (
    <button
      type="button"
      onClick={onShuffle}
      disabled={disabled}
      aria-label="Shuffle in two new cards"
      className={[
        "flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-colors",
        disabled
          ? "border-neutral-200 text-neutral-300"
          : "border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:text-neutral-800",
        className ?? "",
      ].join(" ")}
    >
      {/* Crossing-arrows shuffle glyph: flat tails braid once at center, then run
          level into their chevron heads (curvature lives in the middle, not spread
          across the whole sweep). */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 5 C 10 5, 7 19, 15 19 H 21" />
        <polyline points="17.5 15.5 21 19 17.5 22.5" />
        <path d="M2 19 C 10 19, 7 5, 15 5 H 21" />
        <polyline points="17.5 1.5 21 5 17.5 8.5" />
      </svg>
    </button>
  );
}
