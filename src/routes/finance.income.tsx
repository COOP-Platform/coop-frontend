import { createFileRoute } from '@tanstack/react-router';

import { IncomePage, FinanceAccessGate } from '@/features/finance';

interface RecordSearch {
  /** `?record=true` opens the Record form (from the dashboard). */
  record?: boolean;
}

export const Route = createFileRoute('/finance/income')({
  validateSearch: (raw: Record<string, unknown>): RecordSearch => ({
    record: raw.record === true || raw.record === 'true' ? true : undefined,
  }),
  component: IncomeRoute,
});

function IncomeRoute() {
  const { record } = Route.useSearch();
  return (
    <FinanceAccessGate permission="finance.income.view">
      <IncomePage startRecording={record === true} />
    </FinanceAccessGate>
  );
}
