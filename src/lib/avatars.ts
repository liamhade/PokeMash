// The 20 Gen 1 Pokémon a player can pick as their avatar. Slugs are what the
// profiles.avatar column stores; sprites live in /public/avatars (96×96 pixel
// art — render with image-rendering: pixelated so scaling stays crisp).
// Ordered for the picker grid: mascot first, starter lines, then fan favorites.

export type AvatarChoice = { slug: string; name: string };

export const AVATARS: AvatarChoice[] = [
  { slug: "pikachu", name: "Pikachu" },
  { slug: "charmander", name: "Charmander" },
  { slug: "charizard", name: "Charizard" },
  { slug: "squirtle", name: "Squirtle" },
  { slug: "blastoise", name: "Blastoise" },
  { slug: "bulbasaur", name: "Bulbasaur" },
  { slug: "venusaur", name: "Venusaur" },
  { slug: "eevee", name: "Eevee" },
  { slug: "jigglypuff", name: "Jigglypuff" },
  { slug: "psyduck", name: "Psyduck" },
  { slug: "gengar", name: "Gengar" },
  { slug: "snorlax", name: "Snorlax" },
  { slug: "machamp", name: "Machamp" },
  { slug: "alakazam", name: "Alakazam" },
  { slug: "lapras", name: "Lapras" },
  { slug: "gyarados", name: "Gyarados" },
  { slug: "dragonite", name: "Dragonite" },
  { slug: "articuno", name: "Articuno" },
  { slug: "mewtwo", name: "Mewtwo" },
  { slug: "mew", name: "Mew" },
];

/** Sprite path for a stored avatar slug; null for unknown slugs so a stale or
 * tampered value degrades to the default person glyph instead of a broken img. */
export function avatarSrc(slug: string | null | undefined): string | null {
  if (!slug || !AVATARS.some((choice) => choice.slug === slug)) return null;
  return `/avatars/${slug}.png`;
}
