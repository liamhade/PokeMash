import { tcgplayerUrl } from "@/lib/cardInfo";

// The back face of a flippable card: a details table plus the TCGplayer referral
// button and its FTC disclosure — shared by Rankings and Play so the affiliate link
// and required disclosure live in one place. Expects to sit inside a
// [transform-style:preserve-3d] flip container and fills whatever slot it's given
// (absolute inset-0). Sized compact everywhere: the slot's size tracks the CARD, not
// the viewport (the 238px rankings card is small on a desktop screen too), so
// viewport-breakpoint upsizing overflowed the six-row universal back — the
// disclosure fell off the card's bottom edge.
type CardBackProps = {
  // Label/value rows for the details table, in display order.
  details: [string, string][];
  // The card name the Buy button falls back to searching TCGplayer for.
  buyName: string;
  // The card's TCGplayer product id; when present the button links straight to
  // its product page. Optional: unmatched cards (and pairs restored from older
  // sessionStorage saves) only have the name.
  buyProductId?: number | null;
};

export default function CardBack({ details, buyName, buyProductId }: CardBackProps) {
  return (
    // Type/padding step DOWN below md: the mobile Play card is a 44vw (~172px)
    // slot, smaller than the ~238px rankings card this back was tuned for, so the
    // md sizes overflow it (name off the top, disclosure off the bottom). The
    // compact base fits the phone card; md restores the roomier desktop sizing.
    <div className="absolute inset-0 flex flex-col justify-center gap-0.5 md:gap-2 rounded-xl bg-white p-1.5 md:p-3 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
      <table className="w-full text-[10px] md:text-xs">
        <tbody>
          {details.map(([label, value]) => (
            <tr key={label} className="border-b border-neutral-100 last:border-0">
              <td className="py-0.5 md:py-1.5 pr-1.5 md:pr-2 font-semibold text-neutral-500">{label}</td>
              <td className="py-0.5 md:py-1.5 text-right break-words text-neutral-800">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Referral link to the card's TCGplayer page. stopPropagation so a buy
          click doesn't also flip the card back. mt on top of the column's gap
          gives the button a little breathing room from the details table. */}
      <a
        href={tcgplayerUrl(buyName, buyProductId)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={(event) => event.stopPropagation()}
        className="mt-1 md:mt-2 rounded-lg bg-red-600 px-2 md:px-3 py-1.5 md:py-2 text-center text-[10px] md:text-xs font-semibold text-white transition-colors hover:bg-red-700"
      >
        Buy on TCGplayer
      </a>

      {/* FTC affiliate disclosure — required wherever a referral link appears. */}
      <span className="text-center text-[8px] md:text-[9px] leading-tight text-neutral-400">
        As a TCGplayer affiliate, PokeMash earns from qualifying purchases.
      </span>
    </div>
  );
}
