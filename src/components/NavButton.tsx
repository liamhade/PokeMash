import Link from "next/link";

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
    <Link
      href={href}
      className="rounded-lg px-4 py-2 font-semibold text-neutral-800 transition-all duration-200 ease-out hover:scale-110 hover:text-red-600 active:scale-95"
    >
      {children}
    </Link>
  );
}
