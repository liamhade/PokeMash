import KeepWinnerToggle from "./KeepWinnerToggle";
import UndoButton from "./UndoButton";

// Right column flanking the comparison area: the Keep Winner toggle and the "Go back"
// control. items-end keeps them against the outer edge, mirroring where the toggle sat in
// the old top-right toolbar. Hidden below md — the mobile toolbar in ComparisonScreen
// renders the same controls instead.
type PanelRightProps = {
  keepWinner: boolean;
  onToggleKeepWinner: () => void;
  canUndo: boolean;
  onUndo: () => void;
};

export default function PanelRight({
  keepWinner,
  onToggleKeepWinner,
  canUndo,
  onUndo,
}: PanelRightProps) {
  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col items-end gap-4 px-6 py-4">
      <KeepWinnerToggle keepWinner={keepWinner} onToggle={onToggleKeepWinner} />
      <UndoButton onUndo={onUndo} disabled={!canUndo} />
    </aside>
  );
}
