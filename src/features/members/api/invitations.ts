import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface SendInvitationRequest {
  community: string;
  email: string;
  full_name: string;
  member_category: string;
}

export interface Invitation {
  id: string;
  community: string;
  email: string;
  full_name: string;
  member_category: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

/**
 * BLOCKED ON THE BACKEND — this request cannot currently succeed.
 *
 * `POST /api/invitations/` is a plain ModelViewSet over the `Invitation`
 * model, so DRF requires every writable field, including:
 *
 *  - `token_hash`, the SHA-256 of the invite token. The model's own comment
 *    says the raw token is never stored, which only holds if the server mints
 *    it. A client-generated token is not a secret and defeats the invite link.
 *  - `invited_by`, the inviter's *membership* id — the client has no way to
 *    know it, and it must be derived from the session anyway.
 *  - `community`, likewise derivable from the signed-in user's membership.
 *
 * It also sends no email or SMS: `invitation_email_sent_at` and
 * `credential_email_sent_at` exist on the model but nothing populates them.
 *
 * What is needed is one endpoint that takes `{email, full_name,
 * member_category}`, mints and hashes the token, resolves community and
 * inviter from the request user, and dispatches the two emails. The request
 * below is shaped for that endpoint; until it exists the API answers 400 and
 * the form surfaces the missing-field errors verbatim.
 */
export function useSendInvitation() {
  return useMutation({
    mutationFn: (invitation: SendInvitationRequest) =>
      apiFetch<Invitation>('/invitations/', {
        method: 'POST',
        body: invitation,
      }),
  });
}
