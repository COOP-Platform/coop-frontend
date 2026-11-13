import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';

// Placeholder: replaced by the page that owns this route.
export const Route = createFileRoute('/meetings/events/$eventId')({
  component: Page,
});

function Page() {
  return (
    <div className="page">
      <PageHeader title="Events" />
      <ComingSoon title="Events are on the way" message="This page is being built." />
    </div>
  );
}
