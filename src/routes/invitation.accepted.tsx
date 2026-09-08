import { createFileRoute } from '@tanstack/react-router';

import { InvitationAccepted, OnboardingLayout } from '@/features/onboarding';

export const Route = createFileRoute('/invitation/accepted')({
  component: InvitationAcceptedPage,
});

function InvitationAcceptedPage() {
  return (
    <OnboardingLayout>
      <InvitationAccepted />
    </OnboardingLayout>
  );
}
