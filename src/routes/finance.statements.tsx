import { createFileRoute } from '@tanstack/react-router';

import { CashFlowStatement, FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/statements')({
  component: StatementsPage,
});

/* The community's cash flow statement; every member reads it (finance.report.view). */
function StatementsPage() {
  return (
    <FinanceAccessGate permission="finance.report.view">
      <CashFlowStatement />
    </FinanceAccessGate>
  );
}
