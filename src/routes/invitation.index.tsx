import { createFileRoute } from '@tanstack/react-router';

import { AcceptInvitation, OnboardingLayout } from '@/features/onboarding';

export const Route = createFileRoute('/invitation/')({
  // `id` for now — see the note on useInvitation. It becomes `token` once an
  // endpoint exists that can resolve one.
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === 'string' && search.id !== '' ? search.id : undefined,
  }),
  component: AcceptInvitationPage,
});

function AcceptInvitationPage() {
  const { id } = Route.useSearch();

  return (
    <OnboardingLayout>
      <AcceptInvitation invitationId={id} />
    </OnboardingLayout>
  );
}
