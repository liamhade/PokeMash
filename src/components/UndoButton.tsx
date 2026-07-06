// "Go back" control for Play: restores the previous matchup so the user can reselect.
// Disabled when there's nothing to undo (no pick yet, or already stepped back) or while
// the board is mid-animation. Rendered in both the desktop right panel and the mobile
// toolbar, so layout is left to the caller's `className`.
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
        "flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        disabled
          ? "border-neutral-200 text-neutral-300"
          : "border-neutral-300 text-neutral-700 hover:border-neutral-400",
        className ?? "",
      ].join(" ")}
    >
      <span aria-hidden>↶</span> Go Back
    </button>
  );
}
