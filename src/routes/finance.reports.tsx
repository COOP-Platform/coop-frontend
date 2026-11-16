import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { FinanceAccessGate, ReportsHubPage } from '@/features/finance';

interface Search {
  /** The cash flow statement when absent. */
  tab?: 'categories' | 'years';
}

export const Route = createFileRoute('/finance/reports')({
  beforeLoad: requirePermission('finance.report.view', '/finance'),
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'categories' || raw.tab === 'years' ? raw.tab : undefined,
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
          void navigate({ search: { tab: next === 'statement' ? undefined : next } })
        }
      />
    </FinanceAccessGate>
  );
}
