import type { Metadata } from "next";
import { Source_Code_Pro, Coral_Pixels } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

// App-wide font. next/font/google self-hosts the font at build time and exposes it
// as a CSS variable (--font-source-code-pro) that globals.css wires into Tailwind's
// --font-sans. To try a different font, swap this import + call for any Google font
// (e.g. Inter, Roboto, Poppins) and update the variable name in globals.css.
const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

// Decorative pixel font used only for the floating ELO change numbers (--font-elo).
// Coral Pixels ships a single weight, so next/font requires an explicit `weight`.
const coralPixels = Coral_Pixels({
  variable: "--font-elo",
  subsets: ["latin"],
  weight: "400",
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
      className={`${sourceCodePro.variable} ${coralPixels.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
