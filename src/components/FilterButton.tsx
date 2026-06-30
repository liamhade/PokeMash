import PillButton from "@/components/PillButton";

// The single source of truth for the "Filter" trigger shared by the compare and
// rankings screens. Each screen passes its own openFilter handler.
export default function FilterButton({ onClick }: { onClick: () => void }) {
  return <PillButton onClick={onClick}>Filter</PillButton>;
}
