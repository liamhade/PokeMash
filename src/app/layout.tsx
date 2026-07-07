import type { Metadata } from "next";
import { DotGothic16, Bitcount_Prop_Single } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

// App-wide UI font: a legible dot-matrix face (Game-Boy-era feel, but with real
// lowercase so body text stays readable). next/font self-hosts it and exposes the
// CSS variable that globals.css wires into --font-sans; swap the import + variable
// to try another. Single 400 weight — bold text is browser-synthesized.
const dotGothic = DotGothic16({
  weight: "400",
  variable: "--font-dotgothic",
  subsets: ["latin"],
});

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
      className={`${dotGothic.variable} ${bitcountPropSingle.variable} h-full antialiased`}
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
