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
      {/* Crossing-arrows shuffle glyph. */}
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
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    </button>
  );
}
