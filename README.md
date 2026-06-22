# PokeMash

## Overview

**Core Concept:** ELO-based Pokémon ranking where users perform head-to-head comparisons (FaceMash style) of Pokémon cards, selecting which one they prefer. The system outputs a personalized ranked list of all Pokémon cards based on user preferences.

## Features

### Current
- Head-to-head card comparison interface
- Personal ELO-based rankings
- Anonymous session support with localStorage

### Planned
- Algorithm to recommend best-matched packs based on personal rankings
- Cross-player comparison with global rankings
- 82and0 mechanism

## Architecture

### V1 Infrastructure

#### Frontend
- **Hosting:** Vercel
- **Framework:** React (using Next.js?)
- **Design:** Minimal and sleek, intuitive, warm, dopamine-inducing interaction
- **Ranking Algorithm:** Can utilize TrueSkill for advanced calculations

#### Database
- **Service:** Supabase
- **Purpose:** Store user rankings and comparison history

### V2 Infrastructure
*(To be determined)*

## User Experience

### Anonymous → Account Upgrade
- Let users start comparing without signing up (store progress in `localStorage`)
- Prompt to save progress after ~20 comparisons
- Dramatically reduces signup friction

## Data Management

### Data Sources
- **Primary Source:** [Pokellector.com](https://www.pokellector.com/sets) (has all cards)
- **Formatted Data:** Pokemon TCG Data (provides data in correct format)

### Data Strategy
- Design programmatic data objects to be abstract enough for easy data-source interchange
- Group cards by pack, era, and Pokémon to reduce comparison overhead
- Instead of comparing all ~15,000 cards, users compare at least one card from each group

### Session Queue
- Maintain a queue of cards saved for the user on the backend
- Allow users to pick up where they left off after leaving the site

## Resources

- [GitHub](#)
- [draw.io](#)
- [Liam Claude Chat](#)
