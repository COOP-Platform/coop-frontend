import type { ReactNode } from 'react';

import {
  EmptyState,
  IconBan,
  IconHistory,
  IconMail,
  IconPauseCircle,
  IconTile,
  IconUserMinus,
  IconUserPlus,
} from '@/components/ui';
import type { IconTileTone } from '@/components/ui';
import { formatRelative } from '@/lib/format/date';

import type { Activity, ActivityKind } from '../activity';

const KIND: Record<ActivityKind, { icon: ReactNode; tone: IconTileTone }> = {
  joined: { icon: <IconUserPlus />, tone: 'brand' },
  invited: { icon: <IconMail />, tone: 'info' },
  revoked: { icon: <IconBan />, tone: 'neutral' },
  declined: { icon: <IconUserMinus />, tone: 'neutral' },
  suspended: { icon: <IconPauseCircle />, tone: 'warning' },
};

export function RecentActivity({ entries }: { entries: readonly Activity[] }) {
  return (
    <section className="card activity" aria-labelledby="activity-title">
      <header className="section-head">
        <IconTile tone="info" size="lg">
          <IconHistory />
        </IconTile>
        <div className="section-head__text">
          <h2 id="activity-title" className="section-head__title">
            Recent Activity
          </h2>
          <p className="section-head__subtitle">Latest operational and membership updates</p>
        </div>
        <span className="section-head__meta">Latest</span>
      </header>

      {entries.length === 0 && (
        <EmptyState
          title="Nothing yet"
          message="Invitations sent, members joining and suspensions will show here."
        />
      )}
      <ul className="activity__list" role="list">
        {entries.map((entry) => (
          <li key={entry.id} className="activity__item">
            <IconTile tone={KIND[entry.kind].tone} round size="sm">
              {KIND[entry.kind].icon}
            </IconTile>
            <div className="activity__body">
              <p className="activity__subject">{entry.subject}</p>
              <p className="activity__description">{entry.description}</p>
            </div>
            <time className="activity__time" dateTime={entry.at}>
              {formatRelative(entry.at)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
