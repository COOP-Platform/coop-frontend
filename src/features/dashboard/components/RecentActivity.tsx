import type { ReactNode } from 'react';

import {
  EmptyState,
  IconBan,
  IconMail,
  IconPauseCircle,
  IconTile,
  IconUserMinus,
  IconUserPlus,
  SectionCard,
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
    <SectionCard title="Recent activity" flush>
      {entries.length === 0 ? (
        <EmptyState title="Nothing yet" />
      ) : (
        <ul className="dash-list" role="list">
          {entries.map((entry) => (
            <li key={entry.id} className="dash-list__item">
              <IconTile tone={KIND[entry.kind].tone} round size="sm">
                {KIND[entry.kind].icon}
              </IconTile>
              <div className="dash-list__body">
                <p className="dash-list__title">{entry.subject}</p>
                <p className="dash-list__sub">{entry.description}</p>
              </div>
              <time className="dash-list__time" dateTime={entry.at}>
                {formatRelative(entry.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
