import type { ReactNode } from 'react';

import { Card } from './Card';

interface PanelProps {
  title: string;
  subtitle?: string;
  /** Top-right slot — a unit badge, a "View All" link, a filter. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled surface. Wraps `Card` so elevation and radius stay in one place. */
export function Panel({ title, subtitle, action, children, className }: PanelProps) {
  return (
    <Card className={className ? `panel ${className}` : 'panel'}>
      <div className="panel__header">
        <div className="panel__heading">
          <h2 className="panel__title">{title}</h2>
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </div>
        {action && <div className="panel__action">{action}</div>}
      </div>
      {children}
    </Card>
  );
}
