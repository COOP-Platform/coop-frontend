/*
 * The member directory, assembled on the client.
 *
 * `/memberships/?community_id=` carries each member's name and email. Only
 * those who send invitations also read `/invitations/` — for the "joined
 * through" details on a profile; everyone else never receives invitations
 * at all. Positions come per member from `useMembersPositions`.
 */
import type { PositionSummary } from '@/features/auth';
import { useWorkspace } from '@/features/auth';
import { useCommunity } from '@/features/communities';
import { useMembersPositions } from '@/features/positions';

import type { Invitation } from './invitations';
import { useInvitations } from './invitations';
import type { Membership } from './memberships';
import { useMemberships } from './memberships';

export interface DirectoryMember {
  membershipId: string;
  userId: string;
  fullName: string;
  /** False when the API gave no way to learn the name; `fullName` is a placeholder. */
  nameKnown: boolean;
  email: string | null;
  status: Membership['status'];
  joinDate: string | null;
  activatedAt: string | null;
  suspendedAt: string | null;
  categoryId: string;
  positions: PositionSummary[];
  /** Union of their positions' permissions; empty unless active. */
  permissions: string[];
  isAdmin: boolean;
  /** Positions could not be read (no `position.view`, or still loading). */
  positionsKnown: boolean;
  isFounder: boolean;
  isYou: boolean;
  /** The invitation they joined through, when there is one. */
  invitation: Invitation | undefined;
}

export function useMemberDirectory() {
  const { me, communityId, can } = useWorkspace();
  const memberships = useMemberships(communityId);
  const invitations = useInvitations(communityId, can('member.invite'));
  const community = useCommunity(communityId);

  const rows = (memberships.data ?? []).filter((m) => m.status !== 'removed');
  const positions = useMembersPositions(
    communityId,
    rows.map((m) => m.id),
    can('position.view'),
  );

  const acceptedBy = new Map<string, Invitation>();
  for (const invitation of invitations.data ?? []) {
    if (invitation.accepted_user) acceptedBy.set(invitation.accepted_user, invitation);
  }

  const members: DirectoryMember[] = rows.map((m) => {
    const isYou = m.user === me?.id;
    const invitation = acceptedBy.get(m.user);
    const isFounder = community.data?.owner === m.user;
    const held = positions.byMembership.get(m.id);

    // The membership's own name first; the fallbacks are for an older API.
    const fullName =
      m.full_name ??
      (isYou
        ? (me?.full_name ?? '')
        : (invitation?.full_name ?? (isFounder ? 'Community founder' : 'Unnamed member')));

    return {
      membershipId: m.id,
      userId: m.user,
      fullName,
      nameKnown: m.full_name !== undefined || isYou || invitation !== undefined,
      email: m.email ?? (isYou ? (me?.email ?? null) : (invitation?.email ?? null)),
      status: m.status,
      joinDate: m.join_date,
      activatedAt: m.activated_at,
      suspendedAt: m.suspended_at,
      categoryId: m.member_category,
      positions: held?.positions ?? [],
      permissions: held?.permissions ?? [],
      isAdmin: held?.is_admin ?? false,
      positionsKnown: held !== undefined,
      isFounder,
      isYou,
      invitation,
    };
  });

  return {
    members,
    isPending: memberships.isPending,
    error: memberships.error,
    positionsPending: positions.isPending,
  };
}
