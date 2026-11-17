import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { FinanceAccessGate, ReportsHubPage } from '@/features/finance';

// The cash flow statement only; an old ?tab= link just lands on it.
export const Route = createFileRoute('/finance/reports')({
  beforeLoad: requirePermission('finance.report.view', '/finance'),
  component: Page,
});

function Page() {
  return (
    <FinanceAccessGate permission="finance.report.view">
      <ReportsHubPage />
    </FinanceAccessGate>
  );
}
