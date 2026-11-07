import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';
import { FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/contributions')({
  component: ContributionsPage,
});

// Not built yet — the sidebar entry lands on an honest "coming soon".
function ContributionsPage() {
  return (
    <div className="page">
      <PageHeader title="Contributions" subtitle="Every payment recorded in the community." />
      <FinanceAccessGate permission="finance.contribution.view">
        <ComingSoon
          title="Contributions are on the way"
          message="Reviewing, confirming and rejecting contributions is coming in the next step."
        />
      </FinanceAccessGate>
    </div>
  );
}
