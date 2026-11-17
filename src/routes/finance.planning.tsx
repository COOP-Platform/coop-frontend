import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { BudgetsSharesPage, FinanceAccessGate } from '@/features/finance';

interface Search {
  /** Budgets when absent. */
  tab?: 'campaigns' | 'shares';
  /** Open this budget's details (from an event's page). */
  budget?: string;
  /** Start a budget for this event (from an event's page), named `planTitle`. */
  plan?: string;
  planTitle?: string;
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

export const Route = createFileRoute('/finance/planning')({
  beforeLoad: requirePermission('finance.report.view', '/finance'),
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'campaigns' || raw.tab === 'shares' ? raw.tab : undefined,
    budget: text(raw.budget),
    plan: text(raw.plan),
    planTitle: text(raw.planTitle),
  }),
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinanceAccessGate permission="finance.report.view">
      <BudgetsSharesPage
        tab={tab ?? 'budgets'}
        onTabChange={(next) =>
          void navigate({ search: { tab: next === 'budgets' ? undefined : next } })
        }
      />
    </FinanceAccessGate>
  );
}
