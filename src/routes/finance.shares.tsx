import { createFileRoute } from '@tanstack/react-router';

import { SharesPage, FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/shares')({
  component: Page,
});

function Page() {
  return (
    <FinanceAccessGate permission="finance.report.view">
      <SharesPage />
    </FinanceAccessGate>
  );
}
