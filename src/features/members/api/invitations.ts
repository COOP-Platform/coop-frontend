import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'rejected';

/**
 * `InvitationReadSerializer` — what the owner's list shows.
 *
 * No token or hash: the token exists only in the email. The two `*_sent_at`
 * fields are the ones worth watching — null on either means that leg of the
 * email sequence did not go out and needs resending.
 */
export interface Invitation {
  id: string;
  full_name: string;
  email: string;
  status: InvitationStatus;
  category_id: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  rejected_at: string | null;
  invitation_email_sent_at: string | null;
  credential_email_sent_at: string | null;
  created_at: string;
}

/** Owner-side list, nested under the community. Owner only — 403 otherwise. */
export function useInvitations(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invitations.list(communityId),
    queryFn: () => apiFetch<Invitation[]>(`/communities/${communityId ?? ''}/invitations/`),
    enabled: communityId !== undefined && communityId !== '',
  });
}

export interface SendInvitationInput {
  communityId: string;
  full_name: string;
  email: string;
  category_id: string;
}

/**
 * Invites somebody. The server mints and hashes the token, resolves the
 * inviting membership from the request user, and emails the link — so the
 * client sends only who to invite and in which category, and never sees a
 * token.
 */
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

/** Withdraws a pending invitation. The server sets status and timestamp together. */
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
 * Sends the invitation email again — for the case the list is designed to
 * surface, where `invitation_email_sent_at` came back null. Rate-limited
 * server-side, so a 429 here is expected and not an error to retry.
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
