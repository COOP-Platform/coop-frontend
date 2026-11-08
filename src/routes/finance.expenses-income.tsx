import { createFileRoute } from '@tanstack/react-router';

import { ExpensesIncomePage, FinanceAccessGate } from '@/features/finance';

interface Search {
  /** Expenses when absent. */
  tab?: 'income';
  /** `?record=true` opens the tab's Record form. */
  record?: boolean;
}

export const Route = createFileRoute('/finance/expenses-income')({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'income' ? 'income' : undefined,
    record: raw.record === true || raw.record === 'true' ? true : undefined,
  }),
  component: Page,
});

function Page() {
  const { tab, record } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinanceAccessGate permission="finance.report.view">
      <ExpensesIncomePage
        tab={tab ?? 'expenses'}
        record={record === true}
        onTabChange={(next) =>
          void navigate({ search: { tab: next === 'income' ? 'income' : undefined } })
        }
      />
    </FinanceAccessGate>
  );
}
