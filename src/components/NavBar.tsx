import Image from "next/image";
import Link from "next/link";
import NavButton from "./NavButton";

// Rests atop every screen (rendered in the root layout). Logo on the left; the
// Play / Rankings actions sit in the middle, pushed toward the right. The
// shadow makes the bar look like it floats above the page.
export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 flex items-center bg-white px-6 py-2 shadow-md">
      <Link href="/" className="flex items-center">
        <Image src="/pokemash_logo.png" alt="PokeMash" height={100} width={200} priority className="h-auto w-[100px]" />
      </Link>

      {/* Spacer pushes the buttons toward the right, then a small right margin
          keeps them off the very edge. */}
      <nav className="ml-auto mr-8 flex items-center gap-2">
        <NavButton href="/compare">Play</NavButton>
        <NavButton href="/rankings">Rankings</NavButton>
      </nav>
    </header>
  );
}
