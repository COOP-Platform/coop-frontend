import { useState } from 'react';

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  TableFooter,
  usePaged,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { useExpenses } from '../api/expenses';
import { ExpenseActions } from './ExpensesPage';
import { Money } from './Money';
import { SuccessNotice } from './SuccessNotice';

/**
 * Community Money, "To review": expenses waiting for approval (pocket money,
 * budget spending). Whoever may approve decides here; the one who recorded
 * an expense sees it waiting for someone else.
 */
export function ExpenseReview() {
  const { communityId } = useWorkspace();
  const expenses = useExpenses(communityId, { status: 'pending', page_size: 100 });
  const rows = expenses.data?.items ?? [];
  const paged = usePaged(rows);
  const [notice, setNotice] = useState<string | null>(null);

  if (expenses.isPending) return <LoadingState label="Loading expenses…" />;
  if (expenses.error)
    return <ErrorState title="Couldn't load expenses" message={errorMessage(expenses.error)} />;

  return (
    <div className="money-section">
      {notice && <SuccessNotice text={notice} />}
      <SectionCard
        title="Expenses to approve"
        flush
        footer={rows.length > 0 ? <TableFooter {...paged} onPage={paged.setPage} /> : undefined}
      >
        {rows.length === 0 ? (
          <EmptyState title="Nothing to review" size="sm" />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Expense</th>
                  <th scope="col">Recorded by</th>
                  <th scope="col">Amount</th>
                  <th scope="col" className="table__action-col">
                    Decision
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="table__stack">
                        <span>{row.description}</span>
                        {row.budget && <span className="table__muted">For {row.budget.title}</span>}
                      </span>
                    </td>
                    <td>{row.recorded_by.full_name}</td>
                    <td>
                      <span className="table__stack">
                        <span className="table__amount">
                          <Money minor={row.amount_minor} currency={row.currency} />
                        </span>
                        <span className="table__muted">{formatDate(row.spent_at)}</span>
                      </span>
                    </td>
                    <td className="table__action-col">
                      <ExpenseActions row={row} compact onDone={setNotice} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
