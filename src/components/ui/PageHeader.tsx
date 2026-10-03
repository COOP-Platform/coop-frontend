import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  /** Small uppercase line above the title — "LES COUSINS · FAMILY CIRCLE". */
  eyebrow?: ReactNode;
  /** Pill beside the title — "42 Total". */
  badge?: ReactNode;
  /** Right-aligned buttons. */
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, badge, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__text">
        {eyebrow && <div className="page-header__eyebrow">{eyebrow}</div>}
        <div className="page-header__title-row">
          <h1 className="page-header__title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  );
}
