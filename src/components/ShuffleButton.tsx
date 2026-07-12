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
      {/* Crossing-arrows shuffle glyph: two S-curves swapping lanes, each ending
          level so its chevron head reads as "continues right". */}
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
        <path d="M2 18 C 9 18, 15 6, 21 6" />
        <polyline points="17 2 21 6 17 10" />
        <path d="M2 6 C 9 6, 15 18, 21 18" />
        <polyline points="17 14 21 18 17 22" />
      </svg>
    </button>
  );
}
