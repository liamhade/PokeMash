import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withStorageArt } from "@/lib/cardArt";
import { getTop8Cards } from "../top8Cards";

// The shareable "My Top 8" page: a poster of the eight cards a share code names,
// in rank order. Everything on it is public catalog data — who shared it is not
// in the URL (see lib/top8.ts for why) — so the page needs no session and can be
// unfurled by any scraper. The colocated opengraph-image.tsx renders the preview
// image platforms show when this URL is pasted.

// Same aspect ratio the rankings list uses; the grid scales cells down on phones.
const CARD_WIDTH = 238;
const CARD_HEIGHT = 330;

const TITLE = "My Top 8 Pokémon Cards — CardMash";
const DESCRIPTION =
  "Eight cards that beat everything else, one head-to-head at a time. See the lineup, then rank your own.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: { title: TITLE, description: DESCRIPTION, url: `/top8/${code}`, type: "website" },
    // summary_large_image so the OG image renders as a full-width card, not a
    // thumbnail; the image itself is wired up by the opengraph-image.tsx convention.
    twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  };
}

export default async function Top8Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cards = await getTop8Cards(code);
  if (!cards) notFound();

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 md:py-14">
      <h1 className="text-4xl font-bold md:text-5xl">
        Top <span className="text-red-600">8</span>
      </h1>
      <p className="mt-3 text-center text-sm text-neutral-500 md:text-base">
        Eight favorites, decided one head-to-head at a time.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:mt-12 md:grid-cols-4 md:gap-x-6 md:gap-y-10">
        {cards.map((card, i) => (
          <div key={`${card.card_id}-${i}`} className="relative">
            <Image
              src={withStorageArt(card).image_url ?? ""}
              alt={card.name}
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              className="h-auto w-40 rounded-xl shadow-md md:w-[238px]"
            />
            {/* Rank badge, hung off the card's corner — the app's single red accent. */}
            <span className="absolute -left-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-base font-bold text-white shadow-md">
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <Link
        href="/compare"
        className="mt-10 rounded-full bg-red-600 px-7 py-3 font-semibold text-white transition-colors hover:bg-red-700 md:mt-12"
      >
        Rank your own cards
      </Link>
    </div>
  );
}
