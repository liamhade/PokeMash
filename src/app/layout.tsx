import type { Metadata } from "next";
import { Bitcount_Prop_Single } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

// The app-wide UI font is the platform's own sans (SF Pro on Apple devices) — see
// --font-sans in globals.css. No web font to load; only the pixel rating font below
// is fetched.

// Pixel font for the Rating dial numbers (--font-elo). Monochrome, so the
// green/red is applied with normal CSS color in RatingDial.
const bitcountPropSingle = Bitcount_Prop_Single({
  variable: "--font-elo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PokeMash",
  description: "Rank Pokémon cards through head-to-head comparisons.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bitcountPropSingle.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Impact affiliate site-verification. Rendered as the exact tag Impact supplies
            (non-standard `value=` attribute, which the Next metadata API can't emit);
            React hoists it into <head>. Verifies TCGplayer-referral site ownership. */}
        {/* @ts-expect-error -- `value` isn't a typed <meta> attribute, but Impact requires it verbatim */}
        <meta name="impact-site-verification" value="5a68ea70-0766-428a-9565-df4f3ebf20da" />
        <NavBar />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
