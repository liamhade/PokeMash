"use client";

import { useEffect, useRef, useState } from "react";
import { getPlayerId } from "@/lib/playerId";
import { encodeTop8, TOP8_COUNT } from "@/lib/top8";

// Golden circular share trigger for the player's current top eight. Tapping it
// builds a /top8/<code> link (the code packs the card ids — see lib/top8.ts)
// and opens a menu of share targets — X, Reddit, text, copy link, save/copy
// image — instead of the native share sheet, so every platform gets the same
// options. Fetches the top cards fresh at tap time so the link is always the
// TRUE unfiltered top 8, whatever filters or search the rankings list shows.
//
// The image actions reuse the share page's own OG rendering
// (/top8/<code>/opengraph-image): it's fetched same-origin, needs no
// client-side drawing, and always matches what link previews show.

const SHARE_TITLE = "My Top 8 — CardMash";

export default function ShareTop8Button() {
  // The /top8/<code> code while the menu is open; null = menu closed.
  const [code, setCode] = useState<string | null>(null);
  // A transient status line ("Link copied") floated under the button.
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  function flash(message: string) {
    setNote(message);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(null), 2500);
  }

  // Don't let a pending flash timer fire against an unmounted component.
  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
    },
    [],
  );

  // Esc or a click anywhere outside the button/menu closes the menu.
  useEffect(() => {
    if (!code) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCode(null);
    };
    const onPress = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setCode(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPress);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPress);
    };
  }, [code]);

  async function openMenu() {
    if (code) return setCode(null); // second tap toggles closed
    const playerId = await getPlayerId();
    const res = await fetch(`/api/rankings?playerId=${playerId}&page=0`);
    if (!res.ok) return flash("Something went wrong");
    const data = await res.json();
    const ids = (data.rankings ?? [])
      .slice(0, TOP8_COUNT)
      .map((card: { card_id: string }) => card.card_id);
    const next = encodeTop8(ids);
    if (!next) return flash(`Rank ${TOP8_COUNT}+ cards to share`);
    setCode(next);
  }

  const shareUrl = code ? `${location.origin}/top8/${code}` : "";
  const imageUrl = code ? `/top8/${code}/opengraph-image` : "";

  function openTab(href: string) {
    window.open(href, "_blank", "noopener");
    setCode(null);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCode(null);
    flash("Link copied");
  }

  async function saveImage() {
    const res = await fetch(imageUrl);
    setCode(null);
    if (!res.ok) return flash("Something went wrong");
    const blobUrl = URL.createObjectURL(await res.blob());
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = "cardmash-top8.png";
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  }

  async function copyImage() {
    // ClipboardItem takes the blob as a promise: Safari only allows the write
    // while the user gesture is "live", so the fetch must not happen before it.
    const image = imageUrl;
    setCode(null);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": fetch(image).then((res) => {
            if (!res.ok) throw new Error("og image fetch failed");
            return res.blob();
          }),
        }),
      ]);
      flash("Image copied");
    } catch {
      flash("Couldn't copy image");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={openMenu}
        aria-label="Share your top 8"
        aria-expanded={code !== null}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-neutral-900 transition-colors hover:bg-amber-300"
      >
        {/* Share-nodes glyph: three circles joined by two spokes. */}
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <circle cx="6.5" cy="12" r="2.8" />
          <circle cx="17.5" cy="5.5" r="2.8" />
          <circle cx="17.5" cy="18.5" r="2.8" />
          <line x1="9" y1="10.5" x2="15" y2="7" />
          <line x1="9" y1="13.5" x2="15" y2="17" />
        </svg>
      </button>

      {code && (
        <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg">
          {(
            [
              {
                label: "Post to X",
                run: () =>
                  openTab(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TITLE)}&url=${encodeURIComponent(shareUrl)}`,
                  ),
              },
              {
                label: "Post to Reddit",
                run: () =>
                  openTab(
                    `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(SHARE_TITLE)}`,
                  ),
              },
              {
                label: "Text a friend",
                // sms:?&body= is the one form both iOS and Android accept.
                // Navigate rather than open a tab — popup blockers and _blank
                // don't play well with protocol handlers.
                run: () => {
                  location.href = `sms:?&body=${encodeURIComponent(`${SHARE_TITLE} ${shareUrl}`)}`;
                  setCode(null);
                },
              },
              { label: "Copy link", run: copyLink },
              { label: "Save image", run: saveImage },
              { label: "Copy image", run: copyImage },
            ] as { label: string; run: () => void }[]
          ).map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.run}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {note && (
        <span className="absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-600 shadow-md">
          {note}
        </span>
      )}
    </div>
  );
}
