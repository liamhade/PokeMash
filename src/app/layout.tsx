import type { Metadata } from "next";
import { Space_Mono, Bitcount_Prop_Single, Fredoka } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import TransferPrompt from "@/components/TransferPrompt";
import UsernamePrompt from "@/components/UsernamePrompt";

// App-wide UI font: a monospace with retro-tech personality — halfway between the
// original Source Code Pro (clean coding mono) and the pixel faces (game feel).
// next/font self-hosts it and exposes the CSS variable that globals.css wires into
// --font-sans; swap the import + variable to try another.
const spaceMono = Space_Mono({
  weight: ["400", "700"],
  variable: "--font-space-mono",
  subsets: ["latin"],
});

// Pixel font for the Rating dial numbers (--font-elo). Monochrome, so the
// green/red is applied with normal CSS color in RatingDial.
const bitcountPropSingle = Bitcount_Prop_Single({
  variable: "--font-elo",
  subsets: ["latin"],
});

// Wordmark font for the CardMash logo (--font-logo): geometric rounded sans,
// the closest Google Font to the Kabel-style letters of Nintendo's vintage
// racetrack logo. Loaded only in the weight the NavBar wordmark uses.
const fredoka = Fredoka({
  weight: "600",
  variable: "--font-logo",
  subsets: ["latin"],
});

const APP_NAME = "CardMash";
const APP_DESCRIPTION = "Rank Pokémon cards through head-to-head comparisons.";

export const metadata: Metadata = {
  // The production domain — the www host is canonical (the apex 308-redirects to it).
  // metadataBase lets Next resolve the relative `url` below (and any future OG image)
  // to absolute URLs — required for correct canonical and social-preview links;
  // without it Next falls back to localhost.
  metadataBase: new URL("https://www.cardmash.io"),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  // So a shared cardmash.io link unfurls with the app's name and pitch rather than a
  // bare URL. No image yet — a text preview beats pointing OG at the favicon.
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: "/",
    siteName: APP_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceMono.variable} ${bitcountPropSingle.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Impact affiliate site-verification. Rendered as the exact tag Impact supplies
            (non-standard `value=` attribute, which the Next metadata API can't emit);
            React hoists it into <head>. Verifies TCGplayer-referral site ownership. */}
        {/* @ts-expect-error -- `value` isn't a typed <meta> attribute, but Impact requires it verbatim */}
        <meta name="impact-site-verification" value="f7e950fd-4984-41a6-90e3-9fe9d8a04c36" />
        <NavBar />
        {/* Invisible until a just-signed-in user has anonymous history to adopt. */}
        <TransferPrompt />
        {/* Invisible until a new user's first sign-in, to offer a username. */}
        <UsernamePrompt />
        <main className="flex flex-1 flex-col">{children}</main>
        {/* Fan-project legal disclaimer, on every page. One quiet line so it
            never competes with the content above it. Leads with what the site IS
            (unofficial fan project) and names the actual rights-holders printed
            on real cards. */}
        <footer className="px-4 py-2 text-center text-[8px] leading-tight text-neutral-400 md:text-[10px]">
          CardMash is an unofficial fan project, not affiliated with, endorsed, or
          sponsored by Nintendo, The Pok&eacute;mon Company, Creatures Inc., or GAME
          FREAK inc. Pok&eacute;mon and card images &copy; their respective owners.
        </footer>
      </body>
    </html>
  );
}
