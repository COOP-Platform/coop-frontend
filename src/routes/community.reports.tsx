import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';

export const Route = createFileRoute('/community/reports')({
  component: ReportsPage,
});

// Not built yet — the sidebar entry lands on an honest "coming soon".
function ReportsPage() {
  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Membership and governance reports for the community." />
      <ComingSoon
        title="Reports are on the way"
        message="We're building reports for your community. Check back soon."
      />
    </div>
  );
}
