import { createFileRoute } from '@tanstack/react-router';

import { ExpensesPage, FinanceAccessGate } from '@/features/finance';

interface RecordSearch {
  /** `?record=true` opens the Record form (from the dashboard). */
  record?: boolean;
}

export const Route = createFileRoute('/finance/expenses')({
  validateSearch: (raw: Record<string, unknown>): RecordSearch => ({
    record: raw.record === true || raw.record === 'true' ? true : undefined,
  }),
  component: ExpensesRoute,
});

function ExpensesRoute() {
  const { record } = Route.useSearch();
  return (
    <FinanceAccessGate permission="finance.expense.view">
      <ExpensesPage startRecording={record === true} />
    </FinanceAccessGate>
  );
}
