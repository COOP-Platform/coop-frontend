import chat from '@/assets/illustrations/chat.svg';
import done from '@/assets/illustrations/done.svg';
import empty from '@/assets/illustrations/empty.svg';
import notFound from '@/assets/illustrations/not-found.svg';
import search from '@/assets/illustrations/search.svg';
import waiting from '@/assets/illustrations/waiting.svg';
import onTheWay from '@/assets/on-the-way.svg';

/*
 * The app's illustrations (unDraw, recoloured to the brand green). One name
 * per situation, so every screen in the same situation shows the same art:
 *
 * - empty: nothing recorded yet
 * - search: no match for a filter or search, or a record that is gone
 * - done: all clear (nothing owed, nothing to review)
 * - chat: no messages or announcements yet
 * - waiting: waiting on someone else (an invitation, a review)
 * - not-found: the 404 page
 * - coming-soon: a feature not built yet
 */
const ART = {
  empty,
  search,
  done,
  chat,
  waiting,
  'not-found': notFound,
  'coming-soon': onTheWay,
} as const;

export type IllustrationName = keyof typeof ART;

interface IllustrationProps {
  name: IllustrationName;
  /** sm in cards and drawers, md for a section, lg for a whole page. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Decorative: the words next to it carry the meaning, so it has no alt text. */
export function Illustration({ name, size = 'md', className }: IllustrationProps) {
  return (
    <img
      src={ART[name]}
      alt=""
      aria-hidden="true"
      className={['illustration', `illustration--${size}`, className].filter(Boolean).join(' ')}
    />
  );
}
