// The Keep Winner switch, extracted so the desktop right panel and the mobile toolbar
// render the identical control. Pure presentation: state lives in ComparisonScreen.
type KeepWinnerToggleProps = {
  keepWinner: boolean;
  onToggle: () => void;
};

export default function KeepWinnerToggle({ keepWinner, onToggle }: KeepWinnerToggleProps) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-3">
      <span className="font-semibold text-neutral-800">Keep Winner</span>
      <button
        type="button"
        role="switch"
        aria-checked={keepWinner}
        onClick={onToggle}
        className={[
          "relative h-7 w-12 rounded-full transition-colors duration-200",
          keepWinner ? "bg-red-600" : "bg-neutral-300",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white transition-transform duration-200",
            keepWinner ? "translate-x-5" : "",
          ].join(" ")}
        />
      </button>
    </label>
  );
}
