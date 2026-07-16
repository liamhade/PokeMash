import PillButton from "@/components/PillButton";

// The single source of truth for the "Filter" trigger shared by the compare and
// rankings screens. Each screen passes its own openFilter handler; `className`
// lets a screen size it (e.g. the rankings page fixes its width to match Share).
export default function FilterButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <PillButton onClick={onClick} className={className}>
      Filter
    </PillButton>
  );
}
