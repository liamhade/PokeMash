// "Go back" control for Play: restores the previous matchup so the user can reselect.
// Icon-only (a counterclockwise loop arrow), meant to sit centered just above the pair.
// Disabled when there's nothing to undo (no pick yet, or already stepped back) or while
// the board is mid-animation.
type UndoButtonProps = {
  onUndo: () => void;
  disabled: boolean;
  className?: string;
};

export default function UndoButton({ onUndo, disabled, className }: UndoButtonProps) {
  return (
    <button
      type="button"
      onClick={onUndo}
      disabled={disabled}
      aria-label="Go back to the previous comparison"
      className={[
        "flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-colors",
        disabled
          ? "border-neutral-200 text-neutral-300"
          : "border-neutral-300 text-neutral-600 hover:border-neutral-400 hover:text-neutral-800",
        className ?? "",
      ].join(" ")}
    >
      {/* Counterclockwise loop-around arrow (the reverse/undo glyph). */}
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
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    </button>
  );
}
