import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { generateInviteToken, hashInviteToken } from '@/lib/api/invite-token';
import { queryKeys } from '@/lib/query-keys';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  community: string;
  email: string;
  full_name: string;
  member_category: string;
  invited_by: string;
  status: InvitationStatus;
  token_hash: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_user: string | null;
  revoked_at: string | null;
  invitation_email_sent_at: string | null;
  credential_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useInvitations(communityId: string | undefined, status?: InvitationStatus) {
  return useQuery({
    queryKey: queryKeys.invitations.list(communityId, status),
    queryFn: () => {
      const params = new URLSearchParams({ community_id: communityId ?? '' });
      if (status !== undefined) {
        params.set('status', status);
      }
      return apiFetch<Invitation[]>(`/invitations/?${params.toString()}`);
    },
    enabled: communityId !== undefined && communityId !== '',
  });
}

export interface SendInvitationInput {
  community: string;
  email: string;
  full_name: string;
  member_category: string;
  /** The inviter's *membership* id, not their user id. */
  invited_by: string;
}

export interface SendInvitationResult {
  invitation: Invitation;
  /**
   * The raw token, which exists only in this response. Nothing emails it, so
   * the caller has to show the resulting link for the inviter to pass on.
   */
  token: string;
}

/**
 * Creates an invitation.
 *
 * The token is minted in the browser because the serializer demands
 * `token_hash` and the viewset provides no alternative — see
 * `lib/api/invite-token.ts` for why that is the wrong place for it. The raw
 * token is returned to the caller and never sent to the API.
 *
 * Still missing on the backend, and not something the client can substitute
 * for: no email or SMS is dispatched (`invitation_email_sent_at` and
 * `credential_email_sent_at` stay null), and there is no endpoint to verify or
 * accept a token, so the invitee cannot complete signup yet.
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SendInvitationInput): Promise<SendInvitationResult> => {
      const token = generateInviteToken();
      const token_hash = await hashInviteToken(token);

      const invitation = await apiFetch<Invitation>('/invitations/', {
        method: 'POST',
        body: { ...input, token_hash },
      });

      return { invitation, token };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
    },
  });
}

/**
 * Revokes an invitation. `Invitation.status` and `revoked_at` are both
 * writable, and the model has no hook that sets the timestamp, so the client
 * sets both or the record ends up inconsistent.
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Invitation>(`/invitations/${id}/`, {
        method: 'PATCH',
        body: { status: 'revoked', revoked_at: new Date().toISOString() },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.invitations.all });
    },
  });
}
