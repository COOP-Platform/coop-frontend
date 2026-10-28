import { createFileRoute } from '@tanstack/react-router';

import { requireUser } from '@/features/auth';
import { CreateCommunityWizard } from '@/features/communities';

// Signed in is enough: a first community from onboarding, or another one from
// the Community app's switcher. The one-owned-community rule is the API's to
// enforce, and the wizard shows its refusal.
export const Route = createFileRoute('/onboarding/create')({
  beforeLoad: async () => {
    await requireUser();
  },
  component: CreateCommunityWizard,
});
