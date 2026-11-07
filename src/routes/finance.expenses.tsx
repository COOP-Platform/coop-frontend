import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon, PageHeader } from '@/components/ui';
import { FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/expenses')({
  component: ExpensesPage,
});

// Not built yet — the sidebar entry lands on an honest "coming soon".
function ExpensesPage() {
  return (
    <div className="page">
      <PageHeader title="Expenses" subtitle="What the community has spent, with receipts." />
      <FinanceAccessGate permission="finance.expense.view">
        <ComingSoon
          title="Expenses are on the way"
          message="Recording and reviewing expenses is coming in the next step."
        />
      </FinanceAccessGate>
    </div>
  );
}
