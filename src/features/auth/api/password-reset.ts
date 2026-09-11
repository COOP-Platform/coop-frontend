import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

/**
 * Forgot-password, in two halves. Both take the token in the request body,
 * and the emailed link puts it in the URL fragment — see
 * `lib/url/hash-token.ts` for why.
 */

export interface RequestPasswordResetResponse {
  detail: string;
}

/**
 * Asks for a reset link. Answers the same message whether or not the address
 * has an account, so it cannot be used to discover who is registered — which
 * is why the screen shows that message verbatim rather than claiming an email
 * is on its way.
 */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch<RequestPasswordResetResponse>('/auth/password-reset/', {
        method: 'POST',
        body: { email },
      }),
  });
}

export interface ConfirmPasswordResetInput {
  token: string;
  new_password: string;
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (input: ConfirmPasswordResetInput) =>
      apiFetch<{ detail: string }>('/auth/password-reset/confirm/', {
        method: 'POST',
        body: input,
      }),
  });
}
