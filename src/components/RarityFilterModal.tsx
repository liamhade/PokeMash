"use client";

import { useState } from "react";

type Props = {
  rarities: string[];
  // Currently-applied filters; seeds the working selection so reopening restores state.
  initialSelected: string[];
  onApply: (rarities: string[]) => void;
  // Cancel path shared by the × button and clicking outside the panel.
  onClose: () => void;
};

// Mounted only while open (the parent controls this), so the working selection
// below starts fresh from initialSelected on every open and edits are discarded
// on cancel without any explicit reset.
export default function RarityFilterModal({
  rarities,
  initialSelected,
  onApply,
  onClose,
}: Props) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Working copy: edits here are discarded on cancel and only committed on Apply.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));

  function toggle(rarity: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rarity)) {
        next.delete(rarity);
      } else {
        next.add(rarity);
      }
      return next;
    });
  }

  const visible = rarities.filter((rarity) =>
    rarity.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      // Click-outside the panel cancels, same as the × button.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
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

        <h2 className="mb-3 text-lg font-semibold text-neutral-800">Rarity</h2>

        {/* applied_filter area: a removable chip per selected rarity. */}
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {[...selected].map((rarity) => (
              <span
                key={rarity}
                className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700"
              >
                {rarity}
                <button
                  type="button"
                  onClick={() => toggle(rarity)}
                  aria-label={`Remove ${rarity}`}
                  className="text-red-500 hover:text-red-800"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => setDropdownOpen(true)}
          placeholder="Search rarities..."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-800 outline-none focus:border-red-500"
        />

        {dropdownOpen && (
          <ul className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-neutral-200">
            {visible.map((rarity) => {
              const isSelected = selected.has(rarity);
              return (
                <li key={rarity}>
                  <label
                    className={[
                      "flex cursor-pointer select-none items-center gap-3 px-3 py-2",
                      isSelected ? "bg-red-50" : "hover:bg-neutral-50",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(rarity)}
                      className="h-4 w-4 accent-red-600"
                    />
                    <span className="text-neutral-800">{rarity}</span>
                  </label>
                </li>
              );
            })}
            {visible.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-400">No matches</li>
            )}
          </ul>
        )}

        <button
          type="button"
          onClick={() => onApply([...selected])}
          className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
