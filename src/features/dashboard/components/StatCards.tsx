import type { ReactNode } from 'react';

import { Card, IconCalendar, IconInfoCircle, IconUsers, IconWallet } from '@/components/ui';

import type { Stat } from '../data/placeholder';

/** Keyed by `Stat.id` so the data stays free of presentation concerns. */
const STAT_ICONS: Record<string, ReactNode> = {
  members: <IconUsers />,
  contributions: <IconWallet />,
  events: <IconCalendar />,
  approvals: <IconInfoCircle />,
};

interface StatCardsProps {
  stats: readonly Stat[];
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <Card key={stat.id} className="stat">
          <div className="stat__header">
            <p className="stat__label">{stat.label}</p>
            <span className="stat__icon" aria-hidden="true">
              {STAT_ICONS[stat.id]}
            </span>
          </div>

          <p className="stat__value">{stat.value}</p>

          <p className="stat__delta">
            <span className={`stat__delta-value stat__delta-value--${stat.delta.tone}`}>
              {stat.delta.label}
            </span>{' '}
            <span className="stat__delta-suffix">{stat.deltaSuffix}</span>
          </p>
        </Card>
      ))}
    </div>
  );
}
