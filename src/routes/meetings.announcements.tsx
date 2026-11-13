import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';

// Placeholder: replaced by the page that owns this route.
export const Route = createFileRoute('/meetings/announcements')({
  component: Page,
});

function Page() {
  return (
    <div className="page">
      <PageHeader title="Announcements" />
      <ComingSoon title="Announcements are on the way" message="This page is being built." />
    </div>
  );
}
