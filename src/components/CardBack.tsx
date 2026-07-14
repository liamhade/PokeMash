import { ebayUrl, tcgplayerUrl } from "@/lib/cardInfo";

// The back face of a flippable card: a details table plus the TCGplayer/eBay
// referral buttons and their FTC disclosure — shared by Rankings and Play so the
// affiliate links and required disclosure live in one place. Expects to sit inside a
// [transform-style:preserve-3d] flip container and fills whatever slot it's given
// (absolute inset-0). Sized compact everywhere: the slot's size tracks the CARD, not
// the viewport (the 238px rankings card is small on a desktop screen too), so
// viewport-breakpoint upsizing overflowed the six-row universal back — the
// disclosure fell off the card's bottom edge.
type CardBackProps = {
  // Label/value rows for the details table, in display order.
  details: [string, string][];
  // The card name the Buy buttons search for when no better key exists.
  buyName: string;
  // The card's TCGplayer product id; when present the button links straight to
  // its product page. Optional: unmatched cards (and pairs restored from older
  // sessionStorage saves) only have the name.
  buyProductId?: number | null;
  // The card's pack, scoping the eBay search past same-name cards. Optional for
  // the same restored-save reason as buyProductId.
  buyPack?: string | null;
  // The card's id, sent as the eBay link's EPN customid so affiliate reports
  // attribute purchases per card. Required — card_id predates every saved shape.
  buyCardId: string;
};

export default function CardBack({ details, buyName, buyProductId, buyPack, buyCardId }: CardBackProps) {
  return (
    // Type/padding step DOWN below md: the mobile Play card is a 44vw (~172px)
    // slot, smaller than the ~238px rankings card this back was tuned for, so the
    // md sizes overflow it (name off the top, disclosure off the bottom). The
    // compact base fits the phone card; md restores the roomier desktop sizing.
    <div className="absolute inset-0 flex flex-col gap-0.5 md:gap-2 rounded-xl bg-white p-1.5 md:p-3 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
      {/* flex-1 stretches the table over all the height the buttons/disclosure don't
          use, and the browser hands a stretched table's extra height to its rows —
          so the details spread across the full card instead of clumping mid-card. */}
      {/* Values sit LEFT-aligned beside their labels (not pushed to the card's right
          edge), so the pair reads as one unit instead of a spanning gap. w-full on the
          value cell hands ALL the surplus width to that column — without it, auto
          table layout splits the surplus across both columns and the gap comes back. */}
      <table className="w-full flex-1 text-[11px] md:text-sm">
        <tbody>
          {details.map(([label, value]) => (
            <tr key={label} className="border-b border-neutral-100 last:border-0">
              {/* nowrap: w-full on the value cell squeezes this column to min-content,
                  which would stack a multi-word label one word per line. */}
              <td className="whitespace-nowrap py-px md:py-1.5 pr-2 md:pr-3 font-semibold text-neutral-500">{label}</td>
              <td className="w-full py-px md:py-1.5 break-words text-neutral-800">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Referral links to the card on TCGplayer and eBay, side by side so the
          second seller costs no extra height (this back has overflowed before).
          stopPropagation so a buy click doesn't also flip the card back. mt on
          top of the column's gap gives the row breathing room from the table. */}
      <div className="mt-1 md:mt-2 flex gap-1 md:gap-1.5">
        <a
          href={tcgplayerUrl(buyName, buyProductId)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label="Buy on TCGplayer"
          onClick={(event) => event.stopPropagation()}
          className="flex-1 rounded-lg bg-red-600 px-1 md:px-2 py-1.5 md:py-2 text-center text-[10px] md:text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          TCGplayer
        </a>
        <a
          href={ebayUrl(buyName, buyPack, buyCardId)}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label="Buy on eBay"
          onClick={(event) => event.stopPropagation()}
          className="flex-1 rounded-lg bg-red-600 px-1 md:px-2 py-1.5 md:py-2 text-center text-[10px] md:text-xs font-semibold text-white transition-colors hover:bg-red-700"
        >
          eBay
        </a>
      </div>

      {/* FTC affiliate disclosure — required wherever a referral link appears. */}
      <span className="text-center text-[8px] md:text-[9px] leading-tight text-neutral-400">
        As an affiliate, CardMash earns from qualifying purchases.
      </span>
    </div>
  );
}
