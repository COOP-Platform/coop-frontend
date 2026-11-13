import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';

// Placeholder: replaced by the page that owns this route.
export const Route = createFileRoute('/meetings/list')({
  component: Page,
});

function Page() {
  return (
    <div className="page">
      <PageHeader title="Meetings" />
      <ComingSoon title="Meetings are on the way" message="This page is being built." />
    </div>
  );
}
