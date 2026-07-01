"use client";

import { useState } from "react";
import Image from "next/image";
import { tcgplayerAffiliateUrl } from "@/lib/tcgplayer";

const WIDTH = 220;
const HEIGHT = 305;

type Props = {
  name: string;
  imageUrl: string;
  // TCGplayer Near-Mint market value; null when the card has no price data.
  marketPrice: number | null;
  // TCGplayer product id for a direct affiliate link; absent until the backfill runs,
  // in which case the affiliate link falls back to a name search.
  productId?: string | null;
};

// A Rankings card that flips (click / Enter / Space) to a back face showing the TCGplayer
// Near-Mint price and an affiliate "Buy on TCGplayer" link (our referral). 3D flip is done
// with a preserve-3d container; each face hides its backside via backface-visibility.
export default function RankingCard({ name, imageUrl, marketPrice, productId }: Props) {
  const [flipped, setFlipped] = useState(false);
  const price =
    marketPrice != null
      ? marketPrice.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : null;

  return (
    <div style={{ perspective: "1000px", width: WIDTH, height: HEIGHT }}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${name}. ${flipped ? "Showing price. Activate to show card." : "Activate to show price."}`}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        className="relative h-full w-full cursor-pointer rounded-xl transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : undefined,
        }}
      >
        {/* Front: the card art. */}
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
          <Image
            src={imageUrl}
            alt={name}
            width={WIDTH}
            height={HEIGHT}
            className="rounded-xl shadow-md"
          />
        </div>

        {/* Back: price + affiliate buy link. */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-neutral-900 p-4 text-center text-white shadow-md"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <span className="text-sm font-semibold">{name}</span>
          <span className="text-2xl font-bold tabular-nums">{price ?? "No price data"}</span>
          {price && <span className="text-xs text-neutral-400">Near Mint · TCGplayer</span>}

          <a
            href={tcgplayerAffiliateUrl({ productId, name })}
            target="_blank"
            rel="noopener noreferrer sponsored"
            // Don't let the buy click also flip the card back.
            onClick={(event) => event.stopPropagation()}
            className="mt-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Buy on TCGplayer
          </a>

          {/* FTC disclosure — required for affiliate links. */}
          <span className="text-[10px] leading-tight text-neutral-500">
            As a TCGplayer affiliate, PokeMash earns from qualifying purchases.
          </span>
        </div>
      </div>
    </div>
  );
}
