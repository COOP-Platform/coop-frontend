import { Link } from '@tanstack/react-router';

import {
  Badge,
  EmptyState,
  IconHistory,
  SectionCard,
  TableFooter,
  usePaged,
} from '@/components/ui';
import { formatShortDate } from '@/lib/format/date';

import type { CashFlowItem } from '../api/summary';
import { humanize } from '../labels';
import { Money } from './Money';

interface RecentFinancialActivityProps {
  entries: readonly CashFlowItem[];
  /** The full list lives on the Contributions page; only linked for those who can open it. */
  showAllLink: boolean;
}

const SOURCE_LABEL: Record<CashFlowItem['source']['type'], string> = {
  contribution: 'Contribution',
  income: 'Income',
  expense: 'Expense',
};

export function RecentFinancialActivity({ entries, showAllLink }: RecentFinancialActivityProps) {
  const paged = usePaged(entries);
  return (
    <SectionCard
      title="Recent activity"
      actions={
        showAllLink && (
          <Link to="/finance/money" className="link-action">
            See all
          </Link>
        )
      }
      flush
      footer={paged.pageCount > 1 ? <TableFooter {...paged} onPage={paged.setPage} /> : undefined}
    >
      {entries.length === 0 ? (
        <EmptyState icon={<IconHistory />} title="No transactions yet" />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Who</th>
                <th scope="col">What</th>
                <th scope="col">Date</th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">Type</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((entry) => {
                const incoming = entry.direction === 'in';
                // The member or payee leads; the narrative ("Monthly contribution", the
                // expense title) is the fallback when the party is hidden.
                const who = entry.party ?? entry.narrative;
                const what = entry.party
                  ? entry.narrative
                  : entry.category
                    ? humanize(entry.category)
                    : '—';
                return (
                  <tr key={`${entry.source.type}-${entry.source.id}`}>
                    <td className="table__name">{who}</td>
                    <td>{what}</td>
                    <td>{formatShortDate(entry.date)}</td>
                    <td
                      className={
                        incoming
                          ? 'num table__amount finance-activity__figure--in'
                          : 'num table__amount'
                      }
                    >
                      <Money
                        minor={entry.amount_minor}
                        currency={entry.currency}
                        sign={incoming ? '+' : '-'}
                      />
                    </td>
                    <td>
                      <Badge tone={incoming ? 'success' : 'warning'}>
                        {SOURCE_LABEL[entry.source.type]}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
