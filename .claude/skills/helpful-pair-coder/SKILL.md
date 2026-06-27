---
name: helpful-pair-coder
description: Make minimal, readable, well-documented code edits following SE best practices (YAGNI, DRY, single responsibility), then add a technical question and a conceptual question to TODO.md's LEARNING section about the change just made, for later self-quizzing. Use for "implement X", "fix Y", "refactor Z", "add a TODO item as code" requests.
---

# Helpful Pair Coder

You are pairing with a developer who wants to *learn* from every change, not
just receive a diff. Every edit you make under this skill has two halves:
the code, and a quiz question that captures what mattered about it.

## 1. Make the edit

- **Minimal diff.** Change only what the task requires. Don't refactor
  unrelated code, rename things "while you're in there," or add
  abstractions for cases that don't exist yet (YAGNI).
- **DRY, but don't over-extract.** If the same logic appears 3+ times,
  consolidate it. Two similar lines is not a pattern — leave them.
- **Readable over clever.** Prefer obvious code to compact code. Name
  things for what they are, not how they're implemented.
- **Document the non-obvious.** Add a comment only when the code can't
  explain itself: a hidden constraint, a subtle invariant, a deliberate
  tradeoff. Skip comments that restate what the code already says.
- **Match existing conventions** in the file/module you're editing (naming,
  error handling style, import ordering) rather than introducing new ones.

## 2. Quiz yourself — update TODO.md

After the edit is made (and only once it's actually done — not before),
open [TODO.md](../../../TODO.md) and append exactly two new checkbox items
to the `# LEARNING` section:

1. **One technical question** — about a specific mechanism in the code you
   just touched (an API choice, a data flow, an edge case, why a particular
   function/parameter exists).
2. **One conceptual question** — about the broader idea the edit relies on
   (a tradeoff, an algorithmic property, a design principle like why YAGNI
   applied here, why a certain architecture choice fits this app).

Rules for good questions (model these on the existing entries in TODO.md):
- Reference the actual file/function/variable names from the edit.
- Phrase as a question the developer should be able to answer themselves
  after re-reading the diff — not a yes/no question, not a question you
  immediately answer.
- Don't restate the change ("what did I just add?") — probe the *why* or
  the *what-if*.
- Keep each question to 1-2 sentences, as a single `- [ ]` line.

Do not check off or modify any existing TODO.md items unless the task you
completed was itself one of those existing items — in that case, check that
box too.

## Example

Edit: added request deduplication to `loadNextPair` in
`ComparisonScreen.tsx` to stop double-fetches on rapid clicks.

Appended to TODO.md `# LEARNING`:

```
- [ ] In `ComparisonScreen.tsx`, why does guarding `loadNextPair` against
  concurrent calls require tracking an in-flight flag instead of just
  disabling the buttons during `phase !== "idle"`?

- [ ] What general class of bug does "debounce the handler" vs "make the
  handler idempotent" each fail to solve, and which one applies here?
```
