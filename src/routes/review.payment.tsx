import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { AuthLayout } from '@/features/auth';
import { PaymentReview } from '@/features/finance';
import type { ReviewAction } from '@/features/finance';
import { readTokenFromHash } from '@/lib/url/hash-token';

/*
 * The Approve / Reject buttons in the Treasurer's email open
 * `{FRONTEND_URL}/review/payment#token=…&action=approve|reject`
 * (coop-backend finance/email_review.py). Public: the signed token is the
 * credential. It sits in the fragment so it never reaches a server log, which
 * is why it is read from `location` rather than validated as a search param.
 */
export const Route = createFileRoute('/review/payment')({
  component: PaymentReviewPage,
});

function readAction(): ReviewAction {
  const raw = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('action');
  return raw === 'reject' ? 'reject' : 'approve';
}

function PaymentReviewPage() {
  // Read once: the emailed link is always a fresh page load.
  const [token] = useState(readTokenFromHash);
  const [action] = useState(readAction);

  return (
    <AuthLayout>
      <PaymentReview token={token} action={action} />
    </AuthLayout>
  );
}
