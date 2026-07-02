import Link from "next/link";

// The nav pill look, shared with the non-link nav actions (Login, How it works)
// so every button in the bar behaves identically.
export const navPillClass =
  "whitespace-nowrap rounded-lg px-2 md:px-4 py-2 font-semibold text-neutral-800 transition-all duration-200 ease-out hover:scale-110 hover:text-red-600 active:scale-95";

// Reusable pill button used in the nav bar (and anywhere a primary nav action is
// needed). Grows and turns red on hover; shrinks slightly on click for feedback.
export default function NavButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={navPillClass}>
      {children}
    </Link>
  );
}
