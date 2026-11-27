import { createFileRoute, redirect } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { BudgetsSharesPage, FinanceAccessGate } from '@/features/finance';

interface Search {
  /** Budgets when absent. */
  tab?: 'campaigns' | 'shares';
  /** Old links: redirects to the budget's own page. */
  budget?: string;
  /** Start a budget for this event (from an event's page), named `planTitle`. */
  plan?: string;
  planTitle?: string;
}

const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);

export const Route = createFileRoute('/finance/planning')({
  beforeLoad: (ctx) => {
    // An old link to a budget (?budget=id) opens the budget's own page.
    if (ctx.search.budget)
      throw redirect({ to: '/finance/budget/$budgetId', params: { budgetId: ctx.search.budget } });
    return requirePermission('finance.report.view', '/finance')();
  },
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
