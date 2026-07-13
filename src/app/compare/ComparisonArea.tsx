import { useState } from "react";
import Image from "next/image";
import { flameColor } from "@/lib/streak";
import { DEFAULT_RATING } from "@/lib/glicko2";
import { formatPrice, orDash, packName } from "@/lib/cardInfo";
import RatingDial from "./RatingDial";
import UndoButton from "@/components/UndoButton";
import CardBack from "@/components/CardBack";

// r/rd/mu are the card's Glicko-2 rating (this player's), sent by /api/comparison/next so
// the client can compute a pick's rating change instantly. set/pack/release_date feed the
// card-info flip. All optional: a pair restored from an older sessionStorage save may
// predate them, in which case we fall back to the default rating / an em dash.
export type Card = {
  card_id: string;
  name: string;
  image_url: string;
  set?: string | null;
  pack?: string | null;
  release_date?: string | null;
  market_price?: number | null;
  tcgplayer_product_id?: number | null;
  r?: number;
  rd?: number;
  mu?: number;
};

// Each card tracks its own vertical position so that in "Keep Winner" mode we can
// hold the winner at center while only the loser slides out and is replaced.
export type Position = "below" | "center" | "above";

// A departing card rendered as an absolute overlay in `overId`'s slot (the overlap swap),
// plus the from→to tween for its rating dial: the overlay mounts after the pick already
// changed the ratings, so the dial can't derive the change from card state like the
// resident cards do — it has to be told both endpoints.
export type Exit = { card: Card; overId: string; dial: { from: number; to: number } };

// Rendered card size, shared with ComparisonScreen's warmImage: next/image derives the
// /_next/image request URL from these, so the preloader must use the exact same values
// or it warms a URL the mounted <Image> never asks for.
export const CARD_IMAGE = { width: 325, height: 450 };

const POSITION_CLASS: Record<Position, string> = {
  below: "translate-y-[120vh]",
  center: "translate-y-0",
  above: "-translate-y-[120vh]",
};

// The two comparison cards. Pure presentation: all pick/animation state lives in
// ComparisonScreen and arrives via props, keeping this area a dumb renderer. The one
// exception is the card-info flip below, which is purely cosmetic so it stays local.
type ComparisonAreaProps = {
  cards: Card[] | null;
  pos: Record<string, Position>;
  pickedId: string | null;
  hoveredId: string | null;
  ready: boolean;
  streak: number;
  streakCardId: string | null;
  poolEmpty: boolean;
  // Total picks this mount; drives the Clefairy's per-pick hop.
  picks: number;
  // Cards sliding out as overlays in other cards' slots (one in Keep Winner mode, the
  // whole pair when it's off). Positions are driven by `pos[card.card_id]`, like the
  // resident cards.
  exiting: Exit[];
  onPick: (card: Card) => void;
  onHover: (id: string | null) => void;
  // "Go back" wiring for the undo button centered above the pair.
  canUndo: boolean;
  onUndo: () => void;
};

export default function ComparisonArea({
  cards,
  pos,
  pickedId,
  hoveredId,
  ready,
  streak,
  streakCardId,
  poolEmpty,
  picks,
  exiting,
  onPick,
  onHover,
  canUndo,
  onUndo,
}: ComparisonAreaProps) {
  // Which card (if any) is showing its info back. At most one at a time: flipping a card
  // closes the other, and any pick closes everything. A flipped card can't be picked —
  // clicking it just flips it back to the front — so "view info" and "choose this card"
  // can never collide on the same click.
  const [flippedId, setFlippedId] = useState<string | null>(null);

  // Art URLs whose <Image> has finished loading. Until then the slot shows a pulsing
  // skeleton and holds back the info button (an orphaned `i` on a blank slot reads as
  // broken). Preloaded art is browser-cached, so it's already `complete` when the <Image>
  // mounts — Safari never fires onLoad for such images, so the ref callback below marks
  // them loaded at mount; onLoad covers the genuinely cold case.
  const [loadedArt, setLoadedArt] = useState<Record<string, true>>({});
  function markLoaded(url: string) {
    setLoadedArt((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  }

  // Click on the card body: a flipped card turns back over; a face-up card is a pick
  // (closing the other card's info back if it was open).
  function pickOrFlipBack(card: Card) {
    if (flippedId === card.card_id) {
      setFlippedId(null);
      return;
    }
    setFlippedId(null);
    onPick(card);
  }

  return (
    // A column so the "Go back" button can sit centered just above the cards row. my-8
    // keeps the cards clear of the top and bottom edges; md keeps pb-40 so the rating
    // dials have room below on desktop. On phones the padding is only the undo button's
    // translate-y hang — any more skews justify-center and the group rides high in the
    // viewport with a lopsided gap underneath.
    <div className="flex flex-1 flex-col items-center justify-center my-4 md:my-8 pb-10 md:pb-40 relative z-10">
      {poolEmpty && (
        <p className="max-w-xs text-center text-neutral-500">
          No cards match these filters. Open{" "}
          <span className="font-semibold text-neutral-700">Filter</span> to widen them.
        </p>
      )}

      {/* The two cards side by side; the gap values restore the original desktop spacing. */}
      <div className="flex items-center justify-center gap-3 md:gap-8 lg:gap-16">
        {cards?.map((card) => {
        const isPicked = pickedId === card.card_id;
        const isHovered = hoveredId === card.card_id && ready;
        // Streak glow only on the card the streak belongs to (the held winner).
        const flame = card.card_id === streakCardId ? flameColor(streak) : null;
        // A departing card overlays THIS card's slot (it leaves as this one arrives).
        const exit = exiting.find((e) => e.overId === card.card_id) ?? null;
        const isFlipped = flippedId === card.card_id;
        const artLoaded = loadedArt[card.image_url] === true;
        // Rows for the info back. Optional fields (older saved pairs) render as an em dash.
        const details: [string, string][] = [
          ["Name", orDash(card.name)],
          ["Pack", packName(card.pack)],
          ["Set", orDash(card.set)],
          ["Released", orDash(card.release_date)],
          ["Near Mint Market Price", formatPrice(card.market_price)],
        ];

        return (
          // Wrapper stays put (the card's slide is a transform, which doesn't
          // affect layout), so the dial anchored here holds its spot under the
          // slot while the card slides away instead of riding off-screen with it.
          <div key={card.card_id} className="relative">
            {/* Pick target. A role=button div (not a <button>) so the info button and
                the back face's referral <a> aren't invalid interactive-in-interactive
                nesting (same pattern as the Rankings flip card). */}
            <div
              role="button"
              tabIndex={0}
              // Marks this card's box for the Clefairy, who peeks over its top
              // edge when her wander path crosses it. The card that just won
              // (still on the board in Keep Winner mode) is also flagged: when
              // a serpent shows up, she always hides behind the winner.
              data-compare-card
              data-compare-winner={isPicked ? "true" : undefined}
              onClick={() => pickOrFlipBack(card)}
              onKeyDown={(event) => {
                // Ignore keys bubbling from the info button / Buy link so activating
                // them doesn't also count as a pick.
                if (event.currentTarget !== event.target) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pickOrFlipBack(card);
                }
              }}
              onMouseEnter={() => onHover(card.card_id)}
              onMouseLeave={() => onHover(null)}
              className={[
                // duration MUST match SLIDE_MS in ComparisonScreen (the slide setTimeouts).
                // `group` lets the info button brighten on card hover; the perspective
                // gives the inner flip its 3D depth.
                "group relative cursor-pointer rounded-xl transition-all duration-[350ms] ease-out [perspective:1000px]",
                POSITION_CLASS[pos[card.card_id] ?? "below"],
                isHovered ? "scale-110" : "scale-100",
                isHovered ? "shadow-[0_0_40px_12px_rgba(0,0,0,0.25)]" : "",
              ].join(" ")}
            >
              {/* Winner flash: a quick one-shot green ring + glow. Keyed by the pick
                  counter so a repeat winner (Keep Winner streak) replays it every click. */}
              {isPicked && (
                <span key={picks} aria-hidden className="pick-flash pointer-events-none absolute z-20" />
              )}
              {/* Streak glow: a colored backing + halo behind the card (z-0). The
                  fill colors the immediate backdrop right up to the border, and the
                  box-shadow glows outward; the tier color escalates with the streak. */}
              {flame && (
                <span
                  aria-hidden
                  className="flame pointer-events-none absolute z-0"
                  style={{ "--flame-color": flame } as React.CSSProperties}
                />
              )}
              {/* Flip container: rotateY lives here, on its own element, so it doesn't
                  fight the outer div's slide/hover transforms. Sits at z-10 like the
                  image used to — above the flame backing, below the pick flash. */}
              <div
                className={[
                  "relative z-10 transition-transform duration-500 [transform-style:preserve-3d]",
                  isFlipped ? "[transform:rotateY(180deg)]" : "",
                ].join(" ")}
              >
                {/* Front: the card art (it defines the slot's size) + the info button. */}
                <div className="relative [backface-visibility:hidden]">
                  {/* Loading skeleton: a card-shaped pulse behind the art (the <img>'s
                      width/height attrs reserve the slot's aspect box before any pixels
                      arrive), gone once the art fades in over it. */}
                  {!artLoaded && (
                    <span
                      aria-hidden
                      className="absolute inset-0 animate-pulse rounded-xl bg-neutral-200/70"
                    />
                  )}
                  <Image
                    src={card.image_url}
                    alt={card.name}
                    {...CARD_IMAGE}
                    // Warmed art is already cached, so on Safari the <img> is `complete`
                    // at mount and onLoad never fires — detect that here. naturalWidth > 0
                    // distinguishes a truly-decoded image from a broken one (both `complete`).
                    ref={(node) => {
                      if (node?.complete && node.naturalWidth > 0) markLoaded(card.image_url);
                    }}
                    onLoad={() => markLoaded(card.image_url)}
                    // Two cards side by side on a phone (44vw each + gap); md and up pins
                    // the original fixed 325px so desktop is unchanged.
                    className={[
                      "h-auto w-[44vw] md:w-[325px] rounded-xl transition-opacity duration-300",
                      artLoaded ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                    priority
                  />
                  {/* Info button: flips to the details back. A tiny corner target, kept
                      spatially clear of the pick surface; faint until the card is
                      hovered so it never competes with the art (and absent entirely
                      until the art exists to be asked about). stopPropagation so a
                      flip is never read as a pick. */}
                  {artLoaded && <span
                    role="button"
                    tabIndex={0}
                    aria-label={`About ${card.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setFlippedId(card.card_id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setFlippedId(card.card_id);
                      }
                    }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 font-serif text-sm italic text-white opacity-80 backdrop-blur-sm transition-opacity hover:bg-black/60 group-hover:opacity-100"
                  >
                    i
                  </span>}
                </div>
                {/* Back: the same details/referral face the Rankings cards use. */}
                <CardBack
                  details={details}
                  buyName={card.name}
                  buyProductId={card.tcgplayer_product_id}
                  buyPack={card.pack}
                />
              </div>
            </div>

            {/* Rating dial under the slot, fading with the card's arrival/departure. Keyed
                by the wrapper: a new occupant remounts it (snap to the new card's rating),
                while a rating change on the same card spins it. Hidden while a departing
                card's dial (below) occupies the spot. */}
            {!exit && (
              <div
                className={[
                  "transition-opacity duration-[350ms]",
                  pos[card.card_id] === "center" ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                <RatingDial value={Math.round(card.r ?? DEFAULT_RATING.r)} />
              </div>
            )}

            {/* Departing card: an absolute overlay filling this slot, sliding out on its
                own position while this card slides in underneath. Its dial stays anchored
                under the slot, ticking down to the loser's new rating. */}
            {exit && (
              <>
                <button
                  disabled
                  aria-hidden
                  className={[
                    "absolute inset-0 z-20 rounded-xl transition-all duration-[350ms] ease-out",
                    POSITION_CLASS[pos[exit.card.card_id] ?? "center"],
                  ].join(" ")}
                >
                  {/* With Keep Winner off the winner departs too — its flash rides along. */}
                  {pickedId === exit.card.card_id && (
                    <span key={picks} aria-hidden className="pick-flash pointer-events-none absolute z-20" />
                  )}
                  <Image
                    src={exit.card.image_url}
                    alt=""
                    {...CARD_IMAGE}
                    className="relative z-10 h-auto w-[44vw] md:w-[325px] rounded-xl"
                  />
                </button>
                <RatingDial from={exit.dial.from} value={exit.dial.to} />
              </>
            )}
          </div>
        );
        })}
      </div>

      {/* Undo control, centered under the gap between the two cards (spacing mirrors its
          old above-the-pair spot). Present whenever a board is up (greyed when there's
          nothing to go back to) so the cards don't shift when it becomes actionable. It
          shares the bottom band with the serpents' swim path; they just pass over it. */}
      {cards && <UndoButton onUndo={onUndo} disabled={!canUndo} className="mt-3 md:mt-4 translate-y-8" />}
    </div>
  );
}
