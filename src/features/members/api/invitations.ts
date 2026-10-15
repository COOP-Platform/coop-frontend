import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/** As stored. `expired` is only written lazily — see `effectiveStatus`. */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'rejected';

/**
 * `communities.serializers.InvitationSerializer`, from
 * `GET /invitations/?community_id=`.
 *
 * This list is used rather than `GET /communities/{id}/invitations/` because
 * it is the only one that says who accepted (`accepted_user`) and who sent it
 * (`invited_by`) — which is also how the member directory learns members'
 * names. See docs/sprint-2-integration.md.
 */
export interface Invitation {
  id: string;
  full_name: string;
  email: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  rejected_at: string | null;
  /** Null means the invitation email failed to send and needs a resend. */
  invitation_email_sent_at: string | null;
  credential_email_sent_at: string | null;
  /** User id, once accepted. */
  accepted_user: string | null;
  community: string;
  member_category: string | null;
  /** Membership id of the inviter. */
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * The status to show. The backend flips a lapsed `pending` invitation to
 * `expired` only when someone next touches it (no scheduled job), so a list
 * can still say `pending` for one whose `expires_at` has passed.
 */
export function effectiveStatus(invitation: Invitation, now = Date.now()): InvitationStatus {
  if (invitation.status === 'pending' && new Date(invitation.expires_at).getTime() <= now) {
    return 'expired';
  }
  return invitation.status;
}

/** How long an accepted invitation stays on the invitations screen. */
export const ACCEPTED_LISTED_FOR_MS = 24 * 60 * 60 * 1000;

/**
 * Whether an invitation belongs on the invitations screen. Once accepted, the
 * person is a member and the Members page is where they live; the accepted
 * invitation is shown for a day as confirmation, then dropped so the list is
 * about invitations still in play. (Unanswered ones the backend deletes 30
 * days after they lapse.)
 */
export function isStillListed(invitation: Invitation, now = Date.now()): boolean {
  if (invitation.status !== 'accepted' || invitation.accepted_at === null) return true;
  return now - new Date(invitation.accepted_at).getTime() < ACCEPTED_LISTED_FOR_MS;
}

/** Every invitation of a community, newest first. */
export function useInvitations(communityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.invitationRecords.list(communityId ?? ''),
    queryFn: () =>
      apiFetch<Invitation[]>(`/invitations/?community_id=${encodeURIComponent(communityId ?? '')}`),
    enabled: enabled && communityId !== undefined,
  });
}

export interface SendInvitationInput {
  communityId: string;
  full_name: string;
  email: string;
  /** Optional: without it the backend uses the community's default category. */
  category_id?: string;
}

/** Needs `member.invite`. 201 even if the email failed — check `invitation_email_sent_at`. */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ communityId, ...body }: SendInvitationInput) =>
      apiFetch<Invitation>(`/communities/${communityId}/invitations/`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
    },
  });
}

/** Withdraws a pending invitation; its link stops working at once. */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Invitation>(`/invitations/${id}/revoke/`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
    },
  });
}

/**
 * Re-sends a pending invitation with a fresh token (the old link dies).
 * Pending only — an expired one needs a new invitation. Limited to 3 an hour
 * per address, so a 429 is expected, not something to retry.
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Invitation>(`/invitations/${id}/resend/`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
    },
  });
}
