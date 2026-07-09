"use client";

import { useState } from "react";

// A small modal for choosing a username. Presentational only — the parent
// decides what saving and dismissing mean (first-sign-in prompt vs. later edit).
// Overlay conventions match the other modals: click-outside or the secondary
// button dismisses. z-[60] sits above the nav dropdown and the transfer prompt,
// so on a first sign-in this shows on top and reveals the transfer offer beneath
// once resolved.

// display_name's DB check constraint is 1–40 chars; mirror it here.
const MAX_LENGTH = 40;

export default function UsernameModal({
  initialName,
  title,
  secondaryLabel,
  onSave,
  onDismiss,
}: {
  initialName: string;
  title: string;
  secondaryLabel: string;
  onSave: (name: string) => void;
  onDismiss: () => void;
}) {
  const [name, setName] = useState(initialName);
  const trimmed = name.trim();

  return (
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-neutral-800">{title}</h2>
        <p className="mb-4 text-sm text-neutral-600">
          This is the name friends see next to your rankings.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmed) onSave(trimmed);
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={MAX_LENGTH}
            autoFocus
            placeholder="Username"
            className="mb-5 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition-colors focus:border-neutral-500"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!trimmed}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 font-semibold text-neutral-800 transition-all hover:bg-neutral-50 active:scale-95"
            >
              {secondaryLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
