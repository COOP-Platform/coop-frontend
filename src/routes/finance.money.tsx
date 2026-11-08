import { createFileRoute } from '@tanstack/react-router';

import { CommunityMoney, FinanceAccessGate } from '@/features/finance';
import type { MoneyTab } from '@/features/finance';

interface MoneySearch {
  /** Which section is open; Member contributions when absent. */
  tab?: MoneyTab;
}

export const Route = createFileRoute('/finance/money')({
  validateSearch: (raw: Record<string, unknown>): MoneySearch => ({
    tab: raw.tab === 'pocket' ? 'pocket' : undefined,
  }),
  component: MoneyPage,
});

function MoneyPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <FinanceAccessGate permission="finance.contribution.view">
      <CommunityMoney
        tab={tab ?? 'members'}
        onTabChange={(next) =>
          void navigate({ search: { tab: next === 'members' ? undefined : next } })
        }
      />
    </FinanceAccessGate>
  );
}
