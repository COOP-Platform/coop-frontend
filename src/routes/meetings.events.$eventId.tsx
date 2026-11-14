import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { EventDetailPage } from '@/features/meetings/components/EventDetailPage';

export const Route = createFileRoute('/meetings/events/$eventId')({
  // Same permission as the sidebar entry (MEETINGS_APP); without it, the dashboard.
  beforeLoad: requirePermission('event.view', '/meetings'),
  component: Page,
});

function Page() {
  const { eventId } = Route.useParams();
  return <EventDetailPage key={eventId} eventId={eventId} />;
}
