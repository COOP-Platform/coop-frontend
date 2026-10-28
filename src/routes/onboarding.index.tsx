import { createFileRoute } from '@tanstack/react-router';

import { requireNoCommunity } from '@/features/auth';
import { OnboardingWelcome } from '@/features/onboarding';

// Where a signed-in user without a community lands — after sign-up, or after
// signing in before founding or joining one. Members go straight to their app.
export const Route = createFileRoute('/onboarding/')({
  beforeLoad: requireNoCommunity,
  component: OnboardingWelcome,
});
