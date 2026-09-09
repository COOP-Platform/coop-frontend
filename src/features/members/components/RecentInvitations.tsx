import { Panel } from '@/components/ui';

import type { Invitation, InvitationStatus } from '../api/invitations';

interface RecentInvitationsProps {
  invitations: readonly Invitation[];
  isPending: boolean;
  communityName?: string;
}

/** First letter of each of the first two words — "Diane Mutesi" -> "DM". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/** `pending` and `expired` both read as outstanding; the rest are terminal. */
const STATE_CLASS: Record<InvitationStatus, string> = {
  pending: 'pending',
  expired: 'pending',
  accepted: 'joined',
  revoked: 'revoked',
};

const STATE_LABEL: Record<InvitationStatus, string> = {
  pending: 'Pending',
  expired: 'Expired',
  accepted: 'Joined',
  revoked: 'Revoked',
};

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const minutes = Math.round((Date.now() - then) / 60_000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / (60 * 24))}d ago`;
}

export function RecentInvitations({
  invitations,
  isPending,
  communityName,
}: RecentInvitationsProps) {
  return (
    <Panel
      title="Recent Invitations"
      subtitle={
        communityName === undefined ? 'Latest activity' : `Latest activity in ${communityName}`
      }
      action={<span className="panel__badge">Roster Feed</span>}
    >
      {isPending ? (
        <p className="roster__empty">Loading invitations…</p>
      ) : invitations.length === 0 ? (
        <p className="roster__empty">No invitations sent yet.</p>
      ) : (
        <ul className="roster" role="list">
          {invitations.map((invitation) => (
            <li key={invitation.id} className="roster__item">
              <span className="roster__avatar" aria-hidden="true">
                {initials(invitation.full_name)}
              </span>
              <span className="roster__body">
                <span className="roster__name">{invitation.full_name}</span>
                <span className="roster__detail">
                  {invitation.email} · sent {relativeDate(invitation.created_at)}
                </span>
              </span>
              <span className={`roster__state roster__state--${STATE_CLASS[invitation.status]}`}>
                {STATE_LABEL[invitation.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
