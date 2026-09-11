import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { AcceptInvitation, OnboardingLayout } from '@/features/onboarding';
import { readTokenFromHash } from '@/lib/url/hash-token';

/*
 * Path and token placement both come from the backend: it emails
 * `{FRONTEND_URL}/invitations/accept#token=…` (see communities/notifiers.py).
 * The token is in the fragment so it never reaches a server log, which is
 * also why it cannot be a validated search param.
 */
export const Route = createFileRoute('/invitations/accept')({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  // Read once: the emailed link is always a fresh page load, and re-reading on
  // every render would fight the fragment being cleared.
  const [token] = useState(readTokenFromHash);

  return (
    <OnboardingLayout>
      <AcceptInvitation token={token} />
    </OnboardingLayout>
  );
}
