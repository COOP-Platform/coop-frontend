import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

/**
 * The three public invitation endpoints.
 *
 * All take the token in the request body rather than the URL, which is why
 * even the read is a POST: a path segment is written into the access log of
 * every hop, and leaks through `Referer` and browser history. Keep it that
 * way — do not "tidy" preview into a GET with a query string.
 */

/**
 * `InvitationPreviewSerializer` — deliberately narrow, since anyone holding
 * the token can read it. Enough to say "you have been invited to X as Y".
 */
export interface InvitationPreview {
  full_name: string;
  email: string;
  community_name: string;
  category_name: string;
  expires_at: string;
  /**
   * False when the invited address already has an account — that person keeps
   * their existing password, so the accept form must not ask for one.
   */
  requires_password: boolean;
}

export function usePreviewInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<InvitationPreview>('/invitations/preview/', {
        method: 'POST',
        body: { token },
      }),
  });
}

export type AcceptOutcome = 'account_created' | 'existing_account';

/**
 * `access` and `refresh` are present only for `account_created`: that person
 * chose their password one request ago and proved they hold the token, so the
 * server signs them straight in. Someone who already had an account gets no
 * tokens and signs in with the password they already have.
 */
export interface AcceptInvitationResponse {
  detail: string;
  outcome: AcceptOutcome;
  community_name: string;
  email: string;
  access?: string;
  refresh?: string;
}

export interface AcceptInvitationInput {
  token: string;
  /** Required only when the preview said `requires_password`. */
  password?: string;
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (input: AcceptInvitationInput) =>
      apiFetch<AcceptInvitationResponse>('/invitations/accept/', {
        method: 'POST',
        body: input,
      }),
  });
}

export interface RejectInvitationResponse {
  detail: string;
  outcome: string;
  community_name: string;
}

/** Declining. Creates nothing, and the token stops working. */
export function useRejectInvitation() {
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<RejectInvitationResponse>('/invitations/reject/', {
        method: 'POST',
        body: { token },
      }),
  });
}
