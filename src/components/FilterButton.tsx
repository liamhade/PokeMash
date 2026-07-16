import PillButton from "@/components/PillButton";

// The single source of truth for the "Filter" trigger shared by the compare and
// rankings screens. Each screen passes its own openFilter handler. Compare uses
// the labeled pill (default); the rankings toolbar asks for the `icon` variant —
// a 36px circle styled like its search button, with a sliders glyph as the label.
export default function FilterButton({
  onClick,
  className,
  variant = "pill",
}: {
  onClick: () => void;
  className?: string;
  variant?: "pill" | "icon";
}) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Filter"
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-800",
          className ?? "",
        ].join(" ")}
      >
        {/* Sliders glyph: three rails with staggered knobs. */}
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <line x1="4" y1="6" x2="12" y2="6" />
          <circle cx="15" cy="6" r="2" />
          <line x1="18" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="6" y2="12" />
          <circle cx="9" cy="12" r="2" />
          <line x1="12" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="10" y2="18" />
          <circle cx="13" cy="18" r="2" />
          <line x1="16" y1="18" x2="20" y2="18" />
        </svg>
      </button>
    );
  }

  return (
    <PillButton onClick={onClick} className={className}>
      Filter
    </PillButton>
  );
}
