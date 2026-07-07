import { tcgplayerSearchUrl } from "@/lib/cardInfo";

// The back face of a flippable card: a details table plus the TCGplayer referral
// button and its FTC disclosure — shared by Rankings and Play so the affiliate link
// and required disclosure live in one place. Expects to sit inside a
// [transform-style:preserve-3d] flip container and fills whatever slot it's given
// (absolute inset-0). Text/padding tighten below md so it also fits the narrower
// phone-width Play cards without overflowing.
type CardBackProps = {
  // Label/value rows for the details table, in display order.
  details: [string, string][];
  // The card name the Buy button searches TCGplayer for.
  buyName: string;
};

export default function CardBack({ details, buyName }: CardBackProps) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2 rounded-xl bg-white p-3 shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] md:p-4">
      <table className="w-full text-xs md:text-sm">
        <tbody>
          {details.map(([label, value]) => (
            <tr key={label} className="border-b border-neutral-100 last:border-0">
              <td className="py-1.5 pr-2 font-semibold text-neutral-500 md:py-2">
                {label}
              </td>
              <td className="py-1.5 text-right break-words text-neutral-800 md:py-2">
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Placeholder referral link (name search until the affiliate product link
          lands). stopPropagation so a buy click doesn't also flip the card back. */}
      <a
        href={tcgplayerSearchUrl(buyName)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={(event) => event.stopPropagation()}
        className="rounded-lg bg-red-600 px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-red-700"
      >
        Buy on TCGplayer
      </a>

      {/* FTC affiliate disclosure — required wherever a referral link appears. */}
      <span className="text-center text-[9px] leading-tight text-neutral-400">
        As a TCGplayer affiliate, PokeMash earns from qualifying purchases.
      </span>
    </div>
  );
}
