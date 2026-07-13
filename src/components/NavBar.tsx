import Link from "next/link";
import NavButton from "./NavButton";
import HowItWorks from "./HowItWorks";
import AccountControl from "./AccountControl";

// Rests atop every screen (rendered in the root layout). Logo top left; the
// primary Play / Rankings actions sit in the exact top middle on desktop
// (absolutely centered so the uneven side clusters can't push them off-center);
// the secondary actions (How it works, and the account control) sit top right.
// On phones everything but the logo flows to the right edge, where true
// centering would collide. The shadow makes the bar look like it floats above
// the page.
export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 relative flex items-center bg-white pl-4 pr-1 md:px-6 py-2 shadow-md">
      <Link href="/" className="flex items-center">
        {/* Wordmark in the style of Nintendo's vintage "racetrack" logo: bold
            rounded red letters inside a slim red oval. Pure text + border (no
            image asset), so it stays crisp at any density and inherits nothing
            from the old pokeball PNG. */}
        <span className="rounded-full border-2 border-red-600 px-3 py-0.5 text-lg leading-snug text-red-600 [font-family:var(--font-logo)]">
          CardMash
        </span>
      </Link>

      <nav className="ml-auto md:ml-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex items-center gap-2">
        <NavButton href="/compare">Play</NavButton>
        <NavButton href="/rankings">Rankings</NavButton>
      </nav>

      <div className="ml-1 md:ml-auto flex items-center gap-0 md:gap-2">
        <HowItWorks />
        <AccountControl />
      </div>
    </header>
  );
}
