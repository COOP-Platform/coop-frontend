import { createFileRoute } from '@tanstack/react-router';

import { AcceptInvitation, OnboardingLayout } from '@/features/onboarding';

// TODO: should be `/invitation/$token` — the screen is meaningless without a
// token to resolve. Kept param-less until an endpoint exists to resolve one.
export const Route = createFileRoute('/invitation/')({
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  return (
    <OnboardingLayout>
      <AcceptInvitation />
    </OnboardingLayout>
  );
}
