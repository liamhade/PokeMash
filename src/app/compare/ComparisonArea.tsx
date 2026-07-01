import Image from "next/image";
import { flameColor } from "@/lib/streak";
import { DEFAULT_RATING } from "@/lib/glicko2";
import RatingDial from "./RatingDial";
import Clefairy from "./Clefairy";

// r/rd/mu are the card's Glicko-2 rating (this player's), sent by /api/comparison/next so
// the client can compute a pick's rating change instantly. Optional: a pair restored from
// an older sessionStorage save may predate them, in which case we fall back to the default.
export type Card = {
  card_id: string;
  name: string;
  image_url: string;
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

const POSITION_CLASS: Record<Position, string> = {
  below: "translate-y-[120vh]",
  center: "translate-y-0",
  above: "-translate-y-[120vh]",
};

// The two comparison cards. Pure presentation: all pick/animation state lives in
// ComparisonScreen and arrives via props, keeping this area a dumb renderer.
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
}: ComparisonAreaProps) {
  return (
    // my-8 keeps the cards clear of the top and bottom edges; pb-40 remains so the
    // rating dials have room below the cards.
    <div className="flex flex-1 items-center justify-center gap-8 lg:gap-16 my-8 pb-40 relative z-10">
      {poolEmpty && (
        <p className="max-w-xs text-center text-neutral-500">
          No cards match these filters. Open{" "}
          <span className="font-semibold text-neutral-700">Filter</span> to widen them.
        </p>
      )}
      {cards?.map((card) => {
        const isPicked = pickedId === card.card_id;
        const isHovered = hoveredId === card.card_id && ready;
        // Streak glow only on the card the streak belongs to (the held winner).
        const flame = card.card_id === streakCardId ? flameColor(streak) : null;
        // A departing card overlays THIS card's slot (it leaves as this one arrives).
        const exit = exiting.find((e) => e.overId === card.card_id) ?? null;

        return (
          // Wrapper stays put (the button's slide is a transform, which doesn't
          // affect layout), so the dial anchored here holds its spot under the
          // slot while the card slides away instead of riding off-screen with it.
          <div key={card.card_id} className="relative">
            <button
              onClick={() => onPick(card)}
              onMouseEnter={() => onHover(card.card_id)}
              onMouseLeave={() => onHover(null)}
              className={[
                // duration MUST match SLIDE_MS in ComparisonScreen (the slide setTimeouts).
                "relative rounded-xl transition-all duration-[350ms] ease-out",
                POSITION_CLASS[pos[card.card_id] ?? "below"],
                isHovered ? "scale-110" : "scale-100",
                isHovered ? "shadow-[0_0_40px_12px_rgba(0,0,0,0.25)]" : "",
                isPicked ? "shadow-[0_0_40px_12px_rgba(34,197,94,0.9)]" : "",
              ].join(" ")}
            >
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
              <Image
                src={card.image_url}
                alt={card.name}
                width={325}
                height={450}
                className="relative z-10 rounded-xl"
                priority
              />
            </button>

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
                  <Image
                    src={exit.card.image_url}
                    alt=""
                    width={325}
                    height={450}
                    className="relative z-10 rounded-xl"
                  />
                </button>
                <RatingDial from={exit.dial.from} value={exit.dial.to} />
              </>
            )}
          </div>
        );
      })}

      <Clefairy picks={picks} />
    </div>
  );
}
