/*
 * A recent-activity feed, derived from timestamps the API already returns.
 *
 * The backend writes an audit log (`audit` app) but exposes no endpoint to
 * read it, so this is rebuilt from memberships (joined, suspended) and — for
 * those who send them — invitations (sent, cancelled, declined). A member
 * who does not invite sees only who joined. Position assignments do not
 * appear: nothing readable records when one happened.
 */
import type { DirectoryMember, Invitation } from '@/features/members';

export type ActivityKind = 'joined' | 'invited' | 'revoked' | 'suspended' | 'declined';

export interface Activity {
  id: string;
  kind: ActivityKind;
  subject: string;
  description: string;
  at: string;
}

export function buildActivity(
  members: readonly DirectoryMember[],
  invitations: readonly Invitation[],
  /** Admin view: invitations and suspensions too. Otherwise joins only. */
  full: boolean,
): Activity[] {
  const entries: Activity[] = [];

  // Joins come from the members themselves, so everyone can see them —
  // including people who joined without an invitation, like the founder.
  for (const member of members) {
    const joinedAt = member.activatedAt ?? member.joinDate;
    if (joinedAt && member.status !== 'invited') {
      entries.push({
        id: `${member.membershipId}-joined`,
        kind: 'joined',
        subject: member.fullName,
        description: 'Joined the community',
        at: joinedAt,
      });
    }
  }

  if (!full) {
    return entries.sort((a, b) => b.at.localeCompare(a.at));
  }

  for (const invitation of invitations) {
    entries.push({
      id: `${invitation.id}-sent`,
      kind: 'invited',
      subject: invitation.email,
      description: 'Invitation sent',
      at: invitation.created_at,
    });
    if (invitation.revoked_at) {
      entries.push({
        id: `${invitation.id}-revoked`,
        kind: 'revoked',
        subject: invitation.email,
        description: 'Invitation cancelled',
        at: invitation.revoked_at,
      });
    }
    if (invitation.rejected_at) {
      entries.push({
        id: `${invitation.id}-rejected`,
        kind: 'declined',
        subject: invitation.email,
        description: 'Invitation declined',
        at: invitation.rejected_at,
      });
    }
  }

  for (const member of members) {
    if (member.suspendedAt && member.status === 'suspended') {
      entries.push({
        id: `${member.membershipId}-suspended`,
        kind: 'suspended',
        subject: member.fullName,
        description: 'Membership suspended',
        at: member.suspendedAt,
      });
    }
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}
