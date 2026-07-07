import Link from "next/link";
import NavButton, { navPillClass } from "./NavButton";
import HowItWorks from "./HowItWorks";
import LogoWordmark from "./LogoWordmark";

// Rests atop every screen (rendered in the root layout). Logo top left; the
// primary Play / Rankings actions sit in the exact top middle on desktop
// (absolutely centered so the uneven side clusters can't push them off-center);
// the secondary actions (How it works, and a Login placeholder) sit top right.
// On phones everything but the logo flows to the right edge, where true
// centering would collide. The shadow makes the bar look like it floats above
// the page.
export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 relative flex items-center bg-white px-4 md:px-6 py-2 shadow-md">
      {/* min-w reserves the finished wordmark's footprint so the typing animation
          doesn't resize the link's hit area as letters appear. */}
      <Link href="/" aria-label="PokeMash" className="flex min-w-[7.5rem] items-center py-1.5">
        <LogoWordmark />
      </Link>

      <nav className="ml-auto md:ml-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex items-center gap-2">
        <NavButton href="/compare">Play</NavButton>
        <NavButton href="/rankings">Rankings</NavButton>
      </nav>

      <div className="ml-1 md:ml-auto flex items-center gap-1 md:gap-2">
        <HowItWorks />
        {/* Placeholder: accounts aren't built yet, so this is an inert pill that
            reserves the spot (and the visual weight) for the real login flow. */}
        <button type="button" title="Coming soon" className={navPillClass}>
          Login
        </button>
      </div>
    </header>
  );
}
