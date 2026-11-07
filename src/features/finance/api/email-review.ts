import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

import type { ContributionDetail } from './my-contributions';

/**
 * The emailed Approve / Reject links (backend `finance/email_review.py`).
 * No sign-in: the signed token from `#token=` is the credential, and it goes
 * in the body of a POST so it never sits in a server-side URL. Each call is
 * a mutation for that reason, the preview included (it changes nothing).
 */
export interface PaymentReviewPreview {
  community: { id: string; name: string };
  reviewer: { membership_id: string; full_name: string };
  contribution: ContributionDetail;
  can_confirm: boolean;
  can_reject: boolean;
  /** Why no decision is possible, e.g. it was already confirmed. */
  blocked_reason: string | null;
}

export function usePreviewPaymentReview() {
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<PaymentReviewPreview>('/contribution-reviews/preview/', {
        method: 'POST',
        body: { token },
      }),
  });
}

export function useConfirmPaymentReview() {
  return useMutation({
    mutationFn: (token: string) =>
      apiFetch<ContributionDetail>('/contribution-reviews/confirm/', {
        method: 'POST',
        body: { token },
      }),
  });
}

export function useRejectPaymentReview() {
  return useMutation({
    mutationFn: ({ token, reason }: { token: string; reason: string }) =>
      apiFetch<ContributionDetail>('/contribution-reviews/reject/', {
        method: 'POST',
        body: { token, reason },
      }),
  });
}
