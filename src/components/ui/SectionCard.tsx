import type { ReactNode } from 'react';
import { useId } from 'react';

interface SectionCardProps {
  /** The card's only heading: a few words, no subtitle. */
  title: ReactNode;
  /** Right side of the header: filters, then buttons. */
  actions?: ReactNode;
  children: ReactNode;
  /** A thin row under the body: a count and pages, or one short note. */
  footer?: ReactNode;
  /**
   * The body runs edge to edge (a table, a list with its own dividers).
   * Otherwise it gets the card's 24 px padding.
   */
  flush?: boolean;
  className?: string;
}

/**
 * The one card: a title on the left, actions on the right, a body and an
 * optional footer. Every section of every page uses it — details, lists,
 * charts and tables alike.
 */
export function SectionCard({
  title,
  actions,
  children,
  footer,
  flush = false,
  className,
}: SectionCardProps) {
  const titleId = useId();
  return (
    <section
      className={['card', 'section-card', className].filter(Boolean).join(' ')}
      aria-labelledby={titleId}
    >
      <header className="section-card__head">
        <h2 id={titleId} className="section-card__title">
          {title}
        </h2>
        {actions && <div className="section-card__actions">{actions}</div>}
      </header>
      <div
        className={flush ? 'section-card__body section-card__body--flush' : 'section-card__body'}
      >
        {children}
      </div>
      {footer && <footer className="section-card__foot">{footer}</footer>}
    </section>
  );
}
