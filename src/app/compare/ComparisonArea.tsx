import Image from "next/image";
import { flameColor } from "@/lib/streak";

// r/rd/mu are the card's Glicko-2 rating (this player's), sent by /api/comparison/next so
// the client can compute a pick's +X/-Y instantly. Optional: a pair restored from an older
// sessionStorage save may predate them, in which case we fall back to the default rating.
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

// A floating "+X / -Y" rating change shown beside a card after a pick. dx/dy are the
// resting offset (px); key forces React to remount and restart the animation when the
// same card scores again in Keep Winner mode.
export type FloatDelta = { delta: number; dx: number; dy: number; key: number };

const POSITION_CLASS: Record<Position, string> = {
  below: "translate-y-[120vh]",
  center: "translate-y-0",
  above: "-translate-y-[120vh]",
};

// The floating "+X / -Y" beside a card. Its own component so the exit overlay can reuse it
// for the departing card. `onEnd` fires when the drift-and-fade animation finishes.
function FloatNumber({ float, onEnd }: { float: FloatDelta; onEnd: () => void }) {
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
      <span
        key={float.key}
        onAnimationEnd={onEnd}
        style={
          {
            "--float-x": `${float.dx}px`,
            "--float-y": `${float.dy}px`,
            fontFamily: "var(--font-elo)", // Bitcount Prop Single (see layout.tsx)
          } as React.CSSProperties
        }
        className={[
          "elo-float block text-4xl font-bold tabular-nums",
          "drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]",
          float.delta > 0 ? "text-green-500" : "text-red-500",
        ].join(" ")}
      >
        {float.delta > 0 ? `+${float.delta}` : float.delta}
      </span>
    </span>
  );
}

// The two comparison cards. Pure presentation: all pick/animation state lives in
// ComparisonScreen and arrives via props, keeping this area a dumb renderer.
type ComparisonAreaProps = {
  cards: Card[] | null;
  pos: Record<string, Position>;
  pickedId: string | null;
  hoveredId: string | null;
  ready: boolean;
  floats: Record<string, FloatDelta>;
  streak: number;
  streakCardId: string | null;
  poolEmpty: boolean;
  // A card sliding out as an overlay in `overId`'s slot (the overlap swap). Its position
  // is driven by `pos[card.card_id]`, its float by `floats[card.card_id]`.
  exiting: { card: Card; overId: string } | null;
  onPick: (card: Card) => void;
  onHover: (id: string | null) => void;
  onFloatEnd: (cardId: string) => void;
};

export default function ComparisonArea({
  cards,
  pos,
  pickedId,
  hoveredId,
  ready,
  floats,
  streak,
  streakCardId,
  poolEmpty,
  exiting,
  onPick,
  onHover,
  onFloatEnd,
}: ComparisonAreaProps) {
  return (
    // my-8 keeps the cards clear of the top and bottom edges; pb-40 remains so the
    // floating rating deltas have room to drift below the cards.
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
        const float = floats[card.card_id];
        // Streak glow only on the card the streak belongs to (the held winner).
        const flame = card.card_id === streakCardId ? flameColor(streak) : null;
        // A departing card overlays THIS card's slot (it leaves as this one arrives).
        const exit = exiting && exiting.overId === card.card_id ? exiting.card : null;
        const exitFloat = exit ? floats[exit.card_id] : undefined;

        return (
          // Wrapper stays put (the button's slide is a transform, which doesn't
          // affect layout), so the float anchored here stays in the white margin
          // while the card slides away instead of riding off-screen with it.
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

            {/* Rating change floating off the card into the white margin. */}
            {float && <FloatNumber float={float} onEnd={() => onFloatEnd(card.card_id)} />}

            {/* Departing card: an absolute overlay filling this slot, sliding out on its own
                position while this card slides in underneath. Its -Y number rides along. */}
            {exit && (
              <>
                <button
                  disabled
                  aria-hidden
                  className={[
                    "absolute inset-0 z-20 rounded-xl transition-all duration-[350ms] ease-out",
                    POSITION_CLASS[pos[exit.card_id] ?? "center"],
                  ].join(" ")}
                >
                  <Image
                    src={exit.image_url}
                    alt=""
                    width={325}
                    height={450}
                    className="relative z-10 rounded-xl"
                  />
                </button>
                {exitFloat && (
                  <FloatNumber float={exitFloat} onEnd={() => onFloatEnd(exit.card_id)} />
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
