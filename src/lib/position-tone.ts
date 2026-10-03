import type { BadgeTone } from '@/components/ui';

/** Mobilising roles read orange in the roster; governance seats read indigo. */
export function positionTone(name: string): BadgeTone {
  return /mobili|event|captain/i.test(name) ? 'warning' : 'info';
}

/** The plain "Member" position reads as text, not a badge, like the design. */
export function isPlainMemberPosition(name: string): boolean {
  return /^members?$/i.test(name.trim());
}
