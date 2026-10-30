import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';
import { FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/reports')({
  component: ReportsPage,
});

// Not built yet — the sidebar entry lands on an honest "coming soon".
function ReportsPage() {
  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Monthly summaries of contributions and expenses." />
      <FinanceAccessGate permission="finance.report.view">
        <ComingSoon
          title="Reports are on the way"
          message="Financial reports are coming in a later step."
        />
      </FinanceAccessGate>
    </div>
  );
}
