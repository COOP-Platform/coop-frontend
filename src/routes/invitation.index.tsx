import { createFileRoute } from '@tanstack/react-router';

import { AcceptInvitation, OnboardingLayout } from '@/features/onboarding';

export const Route = createFileRoute('/invitation/')({
  // The emailed link carries `?token=`. The token only ever leaves this page
  // in a request body — see features/onboarding/api/invitation.ts.
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === 'string' && search.token !== '' ? search.token : undefined,
  }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { token } = Route.useSearch();

  return (
    <OnboardingLayout>
      <AcceptInvitation token={token} />
    </OnboardingLayout>
  );
}
