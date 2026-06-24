# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Guide

Whenever you work on a task from the TODO.md, you must check the boxes that you completed, and update the #LEARNING section with any helpful questions.

## Project status

This repository is in the **planning / pre-implementation** stage. There is no application code, build system, or package manager yet — only the README (product spec), `LICENSE`, and configuration. When asked to build features, you are scaffolding from scratch; align new code with the architecture decisions below rather than assuming an existing framework is in place.

## What PokeMash is

An ELO-based Pokémon card ranking app. Users do head-to-head ("FaceMash"-style) comparisons of Pokémon cards, picking the one they prefer, and the system produces a personalized ranked list. See `README.md` for the full product spec.

## Architecture decisions (from README)

- **Frontend:** React, likely Next.js, hosted on Vercel.
- **Database:** Supabase (Postgres) — stores user rankings and comparison history. The project is already linked via MCP (see below).
- **Ranking algorithm:** ELO, with TrueSkill noted as a candidate for more advanced calculations.
- **Anonymous-first UX:** Users start comparing without signing up; progress is held in `localStorage` and they're prompted to create an account after ~20 comparisons. Designing the anonymous → account upgrade path (migrating localStorage state into Supabase) is a first-class concern, not an afterthought.

## Data model conventions (important, easy to get wrong)

- There are ~15,000 cards. Do **not** build flows that compare all cards pairwise. Cards are grouped by **pack, era, and Pokémon**, and users compare at least one card per group to reduce comparison volume.
- Data sources are Pokellector.com (catalog) and Pokemon TCG Data (formatted). Keep card data objects **abstract enough that the data source can be swapped** — do not couple domain models tightly to one source's schema.
- A per-user **session queue** of upcoming cards lives in the backend so users can resume where they left off.

## Supabase

- Project is connected through the Supabase MCP server (`.mcp.json`, project ref `wmhbvlggntwisedrvncq`).
- Use the Supabase MCP tools for schema work: run `list_tables` before schema changes, and check `get_logs` / `get_advisors` when debugging. `apply_migration` writes directly to the remote project — treat it as production-affecting.

## Notes

- `.claude` and `.mcp.json` are gitignored.
