"use client";

import { AVATARS } from "@/lib/avatars";

// Modal grid of the 20 Gen 1 avatar choices. Picking one calls onSelect and
// closes immediately — the pick is the confirmation, no separate save button.
// Overlay conventions match HowItWorks: click-outside or × to close.
export default function AvatarPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string | null;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-neutral-700"
        >
          <span className="text-2xl leading-none">&times;</span>
        </button>

        <h2 className="mb-4 text-lg font-semibold text-neutral-800">Choose your avatar</h2>

        <div className="grid grid-cols-5 gap-2">
          {AVATARS.map((choice) => (
            <button
              key={choice.slug}
              type="button"
              onClick={() => onSelect(choice.slug)}
              aria-label={choice.name}
              title={choice.name}
              aria-pressed={choice.slug === current}
              className={[
                "rounded-xl p-1 transition-all hover:scale-110 hover:bg-neutral-50 active:scale-95",
                choice.slug === current ? "ring-2 ring-red-600" : "",
              ].join(" ")}
            >
              {/* Plain <img>: local 1 KB sprites gain nothing from next/image,
                  and pixelated rendering keeps the 96px art crisp at any size. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/avatars/${choice.slug}.png`}
                alt={choice.name}
                width={64}
                height={64}
                className="h-full w-full [image-rendering:pixelated]"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
