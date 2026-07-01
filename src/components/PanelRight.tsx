// Right column flanking the comparison area: the Keep Winner toggle. items-end keeps it
// against the outer edge, mirroring where it sat in the old top-right toolbar.
type PanelRightProps = {
  keepWinner: boolean;
  onToggleKeepWinner: () => void;
};

export default function PanelRight({ keepWinner, onToggleKeepWinner }: PanelRightProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col items-end px-6 py-4">
      <label className="flex cursor-pointer select-none items-center gap-3">
        <span className="font-semibold text-neutral-800">Keep Winner</span>
        <button
          type="button"
          role="switch"
          aria-checked={keepWinner}
          onClick={onToggleKeepWinner}
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
    </aside>
  );
}
