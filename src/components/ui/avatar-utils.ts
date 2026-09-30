export type AvatarTone = 'brand' | 'mint' | 'lavender' | 'peach' | 'rose' | 'sky';

const TONES: readonly AvatarTone[] = ['lavender', 'mint', 'sky', 'peach', 'rose'];

/** First letter of each of the first two words — "Jean Claude" -> "JC". */
export function initials(name: string): string {
  return name
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** A stable tone per name, so a person keeps their colour across screens. */
export function toneFor(name: string): AvatarTone {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length] ?? 'lavender';
}
