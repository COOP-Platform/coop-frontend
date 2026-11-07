import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';

export const Route = createFileRoute('/finance/statements')({
  component: StatementsPage,
});

// Not built yet — the sidebar entry lands on an honest "coming soon".
function StatementsPage() {
  return (
    <div className="page">
      <PageHeader
        title="Statements"
        subtitle="Monthly and yearly statements of your contributions."
      />
      <ComingSoon
        title="Statements are on the way"
        message="Statements are coming in a later step."
      />
    </div>
  );
}
