import type { ReactNode } from 'react';

import type { IconTileTone } from './IconTile';
import { IconTile } from './IconTile';

interface StatCardProps {
  label: string;
  value: ReactNode;
  caption?: string;
  icon: ReactNode;
  tone?: IconTileTone;
  /**
   * `card`: white, label and icon on top, caption under the figure (dashboard).
   * `tint`: lavender, uppercase label over the figure, icon on the right (lists).
   */
  variant?: 'card' | 'tint';
  /** Colour the figure itself — an orange count that wants attention. */
  emphasis?: boolean;
}

export function StatCard({
  label,
  value,
  caption,
  icon,
  tone = 'brand',
  variant = 'card',
  emphasis,
}: StatCardProps) {
  const valueClass = emphasis ? `stat-card__value stat-card__value--${tone}` : 'stat-card__value';

  if (variant === 'tint') {
    return (
      <section className="stat-card stat-card--tint">
        <div className="stat-card__body">
          <h2 className="stat-card__label">{label}</h2>
          <p className={valueClass}>{value}</p>
          {caption && <p className="stat-card__caption">{caption}</p>}
        </div>
        <IconTile tone={tone} size="lg">
          {icon}
        </IconTile>
      </section>
    );
  }

  return (
    <section className="stat-card">
      <div className="stat-card__head">
        <h2 className="stat-card__label">{label}</h2>
        <IconTile tone={tone} size="lg">
          {icon}
        </IconTile>
      </div>
      <p className={valueClass}>{value}</p>
      {caption && <p className="stat-card__caption">{caption}</p>}
    </section>
  );
}
