import { createFileRoute } from '@tanstack/react-router';

import { ReportsPage, FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/reports')({
  component: Page,
});

function Page() {
  return (
    <FinanceAccessGate permission="finance.report.view">
      <ReportsPage />
    </FinanceAccessGate>
  );
}
