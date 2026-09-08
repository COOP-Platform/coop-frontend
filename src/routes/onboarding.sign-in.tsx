import { createFileRoute } from '@tanstack/react-router';

import { FirstTimeSignIn, OnboardingLayout } from '@/features/onboarding';

export const Route = createFileRoute('/onboarding/sign-in')({
  component: FirstTimeSignInPage,
});

function FirstTimeSignInPage() {
  return (
    <OnboardingLayout>
      <FirstTimeSignIn />
    </OnboardingLayout>
  );
}
