import { createFileRoute } from '@tanstack/react-router';

import { CommunitySupportPage } from '@/features/platform';

export const Route = createFileRoute('/platform/communities/$communityId')({
  component: SupportPage,
});

function SupportPage() {
  const { communityId } = Route.useParams();
  // Keyed by id: a different community never inherits the last one's reason or records.
  return <CommunitySupportPage key={communityId} communityId={communityId} />;
}
