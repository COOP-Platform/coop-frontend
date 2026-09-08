import { createFileRoute } from '@tanstack/react-router';

import { CreatePassword, OnboardingLayout } from '@/features/onboarding';

export const Route = createFileRoute('/onboarding/password')({
  component: CreatePasswordPage,
});

function CreatePasswordPage() {
  return (
    <OnboardingLayout>
      <CreatePassword />
    </OnboardingLayout>
  );
}
