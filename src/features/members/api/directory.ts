/*
 * The member directory, assembled on the client.
 *
 * The backend has no "members of a community" endpoint that carries people's
 * names: `/memberships/` returns a user *id* per member, and `/users/` only
 * ever returns the caller. So a directory row is joined from three sources:
 *
 *   1. `/memberships/?community_id=`  — who is a member, status, dates.
 *   2. `/invitations/?community_id=`  — name and email for anyone who joined
 *      by accepting an invitation (`accepted_user` = the member's user id).
 *   3. `/auth/me/`                    — the signed-in user's own name.
 *
 * A member reached by none of those (in practice: a founder viewed by someone
 * else) gets a placeholder. Positions come per member from
 * `useMembersPositions`. All of this collapses to one request once the
 * backend adds the endpoint proposed in docs/sprint-2-integration.md.
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
  const invitations = useInvitations(communityId);
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

    const fullName = isYou
      ? (me?.full_name ?? '')
      : (invitation?.full_name ?? (isFounder ? 'Community founder' : 'Unnamed member'));

    return {
      membershipId: m.id,
      userId: m.user,
      fullName,
      nameKnown: isYou || invitation !== undefined,
      email: isYou ? (me?.email ?? null) : (invitation?.email ?? null),
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
