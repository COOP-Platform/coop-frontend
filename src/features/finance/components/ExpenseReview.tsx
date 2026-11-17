import { ErrorState, SectionCard, TableFooter, usePaged } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { useExpenses } from '../api/expenses';
import { ExpenseActions } from './ExpensesPage';
import { Money } from './Money';

/**
 * Expenses section, "To approve": every expense waiting for approval, from
 * any month (pocket money, budget spending). Whoever may approve decides
 * here; the one who recorded an expense sees it waiting for someone else.
 * Shown only while something is pending.
 */
export function ExpenseReview({ onDone }: { onDone: (message: string) => void }) {
  const { communityId } = useWorkspace();
  const expenses = useExpenses(communityId, { status: 'pending', page_size: 100 });
  const rows = expenses.data?.items ?? [];
  const paged = usePaged(rows);

  if (expenses.error)
    return <ErrorState title="Couldn't load expenses" message={errorMessage(expenses.error)} />;
  if (expenses.isPending || rows.length === 0) return null;

  return (
    <SectionCard
      title={`To approve (${rows.length})`}
      flush
      footer={rows.length > 10 ? <TableFooter {...paged} onPage={paged.setPage} /> : undefined}
    >
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
                  <ExpenseActions row={row} compact onDone={onDone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
