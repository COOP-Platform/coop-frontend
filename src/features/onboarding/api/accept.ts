import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { Invitation } from '@/features/members';

/**
 * Loads one invitation for the accept screen.
 *
 * INTERIM: keyed by the invitation's id, taken from the accept link, because
 * there is no endpoint that resolves a raw token. The model stores only
 * `token_hash`, so verifying a token means hashing the incoming value
 * server-side and looking it up — `GET /api/invitations/{id}/` cannot do that.
 *
 * The consequence is that the id in the link is the only thing gating
 * acceptance, and `GET /api/invitations/` lists every id publicly. Replace
 * this with `GET /invitations/verify/?token=…` and switch the link back to
 * carrying the token, which is already generated and hashed on the invite
 * side.
 */
export function useInvitation(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.invitations.all, 'detail', id ?? ''] as const,
    queryFn: () => apiFetch<Invitation>(`/invitations/${id ?? ''}/`),
    enabled: id !== undefined && id !== '',
    retry: false,
  });
}

/**
 * A temporary password for the new account.
 *
 * Generated in the browser only because nothing emails credentials. The real
 * design has the server mint this and send it; here it is handed straight back
 * to the invitee on screen. Shaped to satisfy the checklist on the
 * set-password screen so the first sign-in cannot fail validation.
 */
export function generateTemporaryPassword(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const digits = Array.from(bytes, (b) => (b % 10).toString()).join('');
  return `Coop-${digits}!`;
}

export interface AcceptInvitationInput {
  invitation: Invitation;
}

export interface AcceptInvitationResult {
  userId: string;
  membershipId: string;
  email: string;
  temporaryPassword: string;
}

interface RegisterResult {
  user: { id: string; email: string };
}

interface MembershipResult {
  id: string;
}

/**
 * Accepting an invitation, assembled from the endpoints that exist. There is
 * no `POST /invitations/accept/`, so the four writes the backend would do in
 * one transaction happen here in sequence:
 *
 *   1. create the user with a temporary password
 *   2. flag it `must_change_password`, so first sign-in forces a real one
 *      (`RegisterSerializer` hardcodes it to false)
 *   3. create the membership that actually joins them to the community
 *   4. stamp the invitation accepted
 *
 * Being four calls rather than one, a failure part-way leaves the account
 * created but not enrolled, and nothing rolls back. It also cannot check
 * `expires_at` or that the invitation is still pending in a way a client
 * cannot bypass. Both are reasons this belongs on the server.
 */
export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({ invitation }: AcceptInvitationInput): Promise<AcceptInvitationResult> => {
      const temporaryPassword = generateTemporaryPassword();

      const registered = await apiFetch<RegisterResult>('/auth/register/', {
        method: 'POST',
        body: {
          email: invitation.email,
          full_name: invitation.full_name,
          password: temporaryPassword,
        },
      });

      await apiFetch<unknown>(`/users/${registered.user.id}/`, {
        method: 'PATCH',
        body: { must_change_password: true },
      });

      const membership = await apiFetch<MembershipResult>('/memberships/', {
        method: 'POST',
        body: {
          user: registered.user.id,
          community: invitation.community,
          member_category: invitation.member_category,
          status: 'active',
          join_date: new Date().toISOString().slice(0, 10),
        },
      });

      await apiFetch<unknown>(`/invitations/${invitation.id}/`, {
        method: 'PATCH',
        body: {
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_user: registered.user.id,
        },
      });

      return {
        userId: registered.user.id,
        membershipId: membership.id,
        email: invitation.email,
        temporaryPassword,
      };
    },
  });
}
