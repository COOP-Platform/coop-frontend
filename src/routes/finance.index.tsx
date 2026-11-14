import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { FinanceDashboard } from '@/features/finance';

/*
 * Any finance permission opens the Finance app; every active member holds
 * several (rbac/catalog.py's member baseline). Someone holding none, such as
 * a not-yet-active membership, goes back to the Community app rather than to
 * a dashboard whose every request the API would refuse.
 */
const ANY_FINANCE_ACCESS = [
  'finance.contribution.view',
  'finance.contribution.record',
  'finance.expense.view',
  'finance.income.view',
  'finance.budget.view',
  'finance.report.view',
] as const;

export const Route = createFileRoute('/finance/')({
  beforeLoad: requirePermission(ANY_FINANCE_ACCESS, '/community'),
  component: FinanceDashboard,
});
