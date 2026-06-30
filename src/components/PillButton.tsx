// Generic styled pill button — the shared "template" for neutral pill actions
// (Filter, Skip, etc.). Copy this look by reusing the component rather than the
// raw classes. Extra `className` is appended so callers can extend the base style.
export default function PillButton({
  onClick,
  children,
  type = "button",
  className = "",
  disabled,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-full bg-neutral-100 px-5 py-2 font-semibold text-neutral-800 transition-colors hover:bg-neutral-200 disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
