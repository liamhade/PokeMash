import Image from "next/image";
import Link from "next/link";
import NavButton, { navPillClass } from "./NavButton";
import HowItWorks from "./HowItWorks";

// Rests atop every screen (rendered in the root layout). Top left: the logo plus
// the secondary actions (How it works, and a Login placeholder); the primary
// Play / Rankings actions sit in the exact top middle on desktop (absolutely
// centered so the uneven left cluster can't push them off-center) and fall back
// to the right edge on phones, where true centering would collide with the left
// cluster. The shadow makes the bar look like it floats above the page.
export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 relative flex items-center bg-white px-4 md:px-6 py-2 shadow-md">
      <Link href="/" className="flex items-center">
        {/* The source PNG's outline is thin and light. Until the asset is redrawn (see
            TODO: make logo dark), stack dark drop-shadows on all four sides to fake a
            bolder, darker outline — drop-shadow traces the image's alpha edge. */}
        <Image
          src="/pokemash_logo.png"
          alt="PokeMash"
          height={100}
          width={200}
          priority
          className="h-auto w-[100px] [filter:drop-shadow(1px_0_0_#1a1a1a)_drop-shadow(-1px_0_0_#1a1a1a)_drop-shadow(0_1px_0_#1a1a1a)_drop-shadow(0_-1px_0_#1a1a1a)]"
        />
      </Link>

      <div className="ml-1 md:ml-3 flex items-center gap-1 md:gap-2">
        <HowItWorks />
        {/* Placeholder: accounts aren't built yet, so this is an inert pill that
            reserves the spot (and the visual weight) for the real login flow. */}
        <button type="button" title="Coming soon" className={navPillClass}>
          Login
        </button>
      </div>

      <nav className="ml-auto md:ml-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 flex items-center gap-2">
        <NavButton href="/compare">Play</NavButton>
        <NavButton href="/rankings">Rankings</NavButton>
      </nav>
    </header>
  );
}
