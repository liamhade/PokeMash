import KeepWinnerToggle from "./KeepWinnerToggle";

// Right column flanking the comparison area: the Keep Winner toggle. items-end keeps it
// against the outer edge, mirroring where it sat in the old top-right toolbar. Hidden
// below md — the mobile toolbar in ComparisonScreen renders the same control instead.
type PanelRightProps = {
  keepWinner: boolean;
  onToggleKeepWinner: () => void;
};

export default function PanelRight({ keepWinner, onToggleKeepWinner }: PanelRightProps) {
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col items-end px-6 py-4">
      <KeepWinnerToggle keepWinner={keepWinner} onToggle={onToggleKeepWinner} />
    </aside>
  );
}
