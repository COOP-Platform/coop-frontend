import { createFileRoute } from '@tanstack/react-router';

import { EventDetailPage } from '@/features/meetings/components/EventDetailPage';

export const Route = createFileRoute('/meetings/events/$eventId')({
  component: Page,
});

function Page() {
  const { eventId } = Route.useParams();
  return <EventDetailPage key={eventId} eventId={eventId} />;
}
