import { Panel } from '@/components/ui';

import { useResendInvitation, useRevokeInvitation } from '../api/invitations';
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

const STATE: Record<InvitationStatus, { className: string; label: string }> = {
  pending: { className: 'pending', label: 'Pending' },
  expired: { className: 'expired', label: 'Expired' },
  accepted: { className: 'joined', label: 'Joined' },
  revoked: { className: 'revoked', label: 'Withdrawn' },
  rejected: { className: 'revoked', label: 'Declined' },
};

function relativeDate(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

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
  const revoke = useRevokeInvitation();
  const resend = useResendInvitation();
  const busy = revoke.isPending || resend.isPending;

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
          {invitations.map((invitation) => {
            const state = STATE[invitation.status];
            const emailFailed = invitation.invitation_email_sent_at === null;
            const open = invitation.status === 'pending';

            return (
              <li key={invitation.id} className="roster__item">
                <span className="roster__avatar" aria-hidden="true">
                  {initials(invitation.full_name)}
                </span>
                <span className="roster__body">
                  <span className="roster__name">{invitation.full_name}</span>
                  <span className="roster__detail">
                    {invitation.email} · {relativeDate(invitation.created_at)}
                  </span>
                  {/* The one state the owner has to act on. */}
                  {emailFailed && open && (
                    <span className="roster__warn">Email didn&apos;t send</span>
                  )}
                  {open && (
                    <span className="roster__actions">
                      <button
                        type="button"
                        className="roster__action"
                        onClick={() => resend.mutate(invitation.id)}
                        disabled={busy}
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        className="roster__action roster__action--danger"
                        onClick={() => revoke.mutate(invitation.id)}
                        disabled={busy}
                      >
                        Withdraw
                      </button>
                    </span>
                  )}
                </span>
                <span className={`roster__state roster__state--${state.className}`}>
                  {state.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
