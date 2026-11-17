import type { ReactNode } from 'react';

import type { IconTileTone } from './IconTile';
import { Sparkline } from './Sparkline';

interface StatCardProps {
  label: string;
  value: ReactNode;
  /** One short line under the figure: "2 payments", "↑ 5% vs last year". */
  caption?: ReactNode;
  icon: ReactNode;
  tone?: IconTileTone;
  /** Kept for older callers; every stat card now has the same look. */
  variant?: 'card' | 'tint';
  /** Colour the figure itself — an orange amount that wants attention. */
  emphasis?: boolean;
  /** Small chip beside the label — "Liquid". */
  badge?: ReactNode;
  /** Kept for older callers. */
  highlight?: boolean;
  /** Recent values, oldest first, drawn as a small trend line. Needs 2 or more. */
  trend?: readonly number[];
}

/**
 * The one stat card: a round icon, the label, the figure, one short caption,
 * and an optional trend line in the corner. Every number on every page uses it.
 */
export function StatCard({
  label,
  value,
  caption,
  icon,
  tone = 'brand',
  emphasis,
  badge,
  trend,
}: StatCardProps) {
  return (
    <section className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__row">
        <span className="stat-card__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="stat-card__text">
          <h2 className="stat-card__label">
            {label}
            {badge}
          </h2>
          <p className={emphasis ? 'stat-card__value stat-card__value--tone' : 'stat-card__value'}>
            {value}
          </p>
        </div>
      </div>
      {caption && <p className="stat-card__caption">{caption}</p>}
      {trend && trend.length > 1 && <Sparkline values={trend} className="stat-card__trend" />}
    </section>
  );
}
