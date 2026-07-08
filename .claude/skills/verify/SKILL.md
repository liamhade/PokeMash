---
name: verify
description: How to run and drive PokeMash locally to verify changes end-to-end (dev server, Playwright drive scripts, browser gotchas).
---

# Verifying PokeMash changes

## Launch

- The user usually already has `npm run dev` serving **http://localhost:3000** (check
  `lsof -nP -iTCP:3000 -sTCP:LISTEN`). Hot reload picks up working-tree edits, so just
  use the running server; only start your own if the port is free (needs `.env.local`,
  already scaffolded).

## Drive

- Install Playwright in the scratchpad (not the repo): `npm install playwright@latest`,
  then **drive the user's installed Chrome** with
  `chromium.launch({ channel: 'chrome' })` — no browser download needed.
- **Do not judge rendering in Playwright's WebKit port**: its compositor never culls
  `backface-visibility: hidden` faces (even a textbook minimal flip card shows a
  mirrored back), so the Rankings/Play card flips look broken there while being fine in
  Chrome. Interaction logic is still testable in WebKit; pixels are not.
- Useful hooks: compare cards are `[data-compare-card]` (img `alt` = card name); the
  Play info buttons are `[aria-label^="About"]`; rankings flip cards are
  `[role="button"][aria-pressed]`.
- A fresh browser context = fresh anonymous player (`localStorage` playerId), so
  `/rankings` starts empty — make a pick on `/compare` first if you need ranked cards.
- API smoke test: `GET /api/comparison/next?playerId=<uuid>` (playerId must be a UUID;
  `uuidgen | tr A-Z a-z` works). Wait ~2.5s after load for the pair to settle at center
  before clicking cards.
