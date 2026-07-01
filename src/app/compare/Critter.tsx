// A minimalist critter that keeps the player company at the bottom of the board: it
// bobs gently while idle and does a happy hop every time a pick is made. Purely
// decorative (aria-hidden, no pointer events).
//
// `picks` is a monotonically increasing pick counter. Keying the hop wrapper on it
// remounts that element each pick, which restarts the one-shot `critter-hop`
// animation; the guard on `picks > 0` keeps the initial mount from hopping. The
// idle bob lives on a nested element so the two transforms don't fight.
export default function Critter({ picks }: { picks: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2"
    >
      <div key={picks} className={picks > 0 ? "critter-hop" : ""}>
        <div className="critter-idle text-neutral-400">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            {/* ears */}
            <path
              d="M14 15 L10 5 L20 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M30 15 L34 5 L24 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {/* body */}
            <circle cx="22" cy="27" r="13" stroke="currentColor" strokeWidth="2" />
            {/* eyes */}
            <circle cx="17" cy="25" r="1.6" fill="currentColor" />
            <circle cx="27" cy="25" r="1.6" fill="currentColor" />
            {/* smile */}
            <path
              d="M19 31 Q22 34 25 31"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
