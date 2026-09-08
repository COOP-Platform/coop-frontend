import { Panel } from '@/components/ui';

import type { RosterEntry } from '../data/placeholder';

interface RecentInvitationsProps {
  entries: readonly RosterEntry[];
}

/** First letter of each of the first two words — "Diane Mutesi" -> "DM". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function RecentInvitations({ entries }: RecentInvitationsProps) {
  return (
    <Panel
      title="Recent Invitations"
      subtitle="Latest activity in Les Cousins"
      action={<span className="panel__badge">Roster Feed</span>}
    >
      <ul className="roster" role="list">
        {entries.map((entry) => (
          <li key={entry.id} className="roster__item">
            <span className="roster__avatar" aria-hidden="true">
              {initials(entry.name)}
            </span>
            <span className="roster__body">
              <span className="roster__name">{entry.name}</span>
              <span className="roster__detail">{entry.detail}</span>
            </span>
            <span className={`roster__state roster__state--${entry.state}`}>
              {entry.stateLabel}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
