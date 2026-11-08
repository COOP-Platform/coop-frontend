import { createFileRoute } from '@tanstack/react-router';

import { CommunityMoney, FinanceAccessGate } from '@/features/finance';
import type { MoneyTab } from '@/features/finance';

interface MoneySearch {
  /** Which section is open; This month when absent. */
  tab?: Exclude<MoneyTab, 'month'>;
}

const TABS: readonly string[] = ['review', 'payments', 'pocket', 'accounts'];

export const Route = createFileRoute('/finance/money')({
  validateSearch: (raw: Record<string, unknown>): MoneySearch => ({
    tab:
      typeof raw.tab === 'string' && TABS.includes(raw.tab)
        ? (raw.tab as MoneySearch['tab'])
        : undefined,
  }),
  component: MoneyPage,
});

function MoneyPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinanceAccessGate permission="finance.contribution.view">
      <CommunityMoney
        tab={tab ?? 'month'}
        onTabChange={(next) =>
          void navigate({ search: { tab: next === 'month' ? undefined : next } })
        }
      />
    </FinanceAccessGate>
  );
}
