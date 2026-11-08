import { createFileRoute } from '@tanstack/react-router';

import { AccountsPage, FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/accounts')({
  component: Page,
});

function Page() {
  return (
    <FinanceAccessGate permission="finance.cashflow.view">
      <AccountsPage />
    </FinanceAccessGate>
  );
}
