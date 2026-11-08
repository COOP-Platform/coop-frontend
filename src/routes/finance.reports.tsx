import { createFileRoute } from '@tanstack/react-router';

import { FinanceAccessGate, ReportsHubPage } from '@/features/finance';

interface Search {
  /** The cash flow statement when absent. */
  tab?: 'categories';
}

export const Route = createFileRoute('/finance/reports')({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'categories' ? 'categories' : undefined,
  }),
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinanceAccessGate permission="finance.report.view">
      <ReportsHubPage
        tab={tab ?? 'statement'}
        onTabChange={(next) =>
          void navigate({ search: { tab: next === 'categories' ? 'categories' : undefined } })
        }
      />
    </FinanceAccessGate>
  );
}
