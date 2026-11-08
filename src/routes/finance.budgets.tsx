import { createFileRoute } from '@tanstack/react-router';

import { BudgetsPage, FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/budgets')({
  validateSearch: (raw: Record<string, unknown>): { tab?: 'campaigns' } => ({
    tab: raw.tab === 'campaigns' ? 'campaigns' : undefined,
  }),
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinanceAccessGate permission="finance.budget.view">
      <BudgetsPage
        section={tab ?? 'budgets'}
        onSectionChange={(next) =>
          void navigate({ search: { tab: next === 'campaigns' ? 'campaigns' : undefined } })
        }
      />
    </FinanceAccessGate>
  );
}
