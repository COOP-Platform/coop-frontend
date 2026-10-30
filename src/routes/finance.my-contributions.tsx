import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';

export const Route = createFileRoute('/finance/my-contributions')({
  component: MyContributionsPage,
});

// Not built yet — the sidebar entry lands on an honest "coming soon".
function MyContributionsPage() {
  return (
    <div className="page">
      <PageHeader
        title="My Contributions"
        subtitle="Your payments, and a place to record a new one."
      />
      <ComingSoon
        title="My Contributions are on the way"
        message="Recording a contribution and your payment history are coming in the next step."
      />
    </div>
  );
}
