import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { BudgetPage, FinanceAccessGate } from '@/features/finance';

/* One budget on its own page: lines, money in and out, and Contribute. */
export const Route = createFileRoute('/finance/budget/$budgetId')({
  beforeLoad: requirePermission('finance.report.view', '/finance'),
  component: Page,
});

function Page() {
  const { budgetId } = Route.useParams();
  return (
    <FinanceAccessGate permission="finance.report.view">
      <BudgetPage budgetId={budgetId} />
    </FinanceAccessGate>
  );
}
