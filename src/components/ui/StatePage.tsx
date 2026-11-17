import type { ReactNode } from 'react';

import { Illustration } from './Illustration';
import type { IllustrationName } from './Illustration';

interface StatePageProps {
  art: IllustrationName;
  title: string;
  message?: ReactNode;
  /** Buttons or links: "Go to dashboard", "Try again". */
  actions?: ReactNode;
  /** Inside a card on a page, rather than filling the screen on its own. */
  inCard?: boolean;
}

/**
 * A whole-page state with a large illustration: page not found, something
 * went wrong, coming soon. Empty lists use `EmptyState` instead.
 */
export function StatePage({ art, title, message, actions, inCard = false }: StatePageProps) {
  return (
    <section className={inCard ? 'card state-page state-page--card' : 'state-page'}>
      <Illustration name={art} size="lg" />
      <h1 className="state-page__title">{title}</h1>
      {message && <p className="state-page__message">{message}</p>}
      {actions && <div className="state-page__actions">{actions}</div>}
    </section>
  );
}
