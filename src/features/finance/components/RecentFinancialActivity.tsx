import { Link } from '@tanstack/react-router';

import { Badge, EmptyState, IconArrowRight, IconHistory, IconTile } from '@/components/ui';
import { formatLongDate } from '@/lib/format/date';

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
  return (
    <section className="card finance-activity" aria-labelledby="finance-activity-title">
      <header className="section-head">
        <div className="section-head__text">
          <h2 id="finance-activity-title" className="section-head__title">
            Recent Financial Activity
          </h2>
          <p className="section-head__subtitle">Latest community transactions recorded in ledger</p>
        </div>
      </header>

      {entries.length === 0 && (
        <EmptyState
          icon={<IconHistory />}
          title="No transactions yet"
          message="Confirmed contributions, income and approved expenses will show here."
        />
      )}

      <ul className="finance-activity__list" role="list">
        {entries.map((entry) => {
          const incoming = entry.direction === 'in';
          // The member or payee leads; the narrative ("Monthly contribution", the
          // expense title) is the fallback when the party is hidden.
          const title = entry.party ?? entry.narrative;
          const detail = entry.party ? entry.narrative : entry.category && humanize(entry.category);
          return (
            <li key={`${entry.source.type}-${entry.source.id}`} className="finance-activity__item">
              <IconTile tone={incoming ? 'brand' : 'warning'} round size="md">
                <IconArrowRight
                  className={incoming ? 'finance-arrow finance-arrow--in' : 'finance-arrow'}
                />
              </IconTile>

              <div className="finance-activity__body">
                <p className="finance-activity__title">
                  {title}
                  <Badge tone={incoming ? 'success' : 'warning'}>
                    {SOURCE_LABEL[entry.source.type]}
                  </Badge>
                </p>
                <p className="finance-activity__meta">
                  {[detail, incoming ? 'Received' : 'Disbursed', formatLongDate(entry.date)]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>

              <div className="finance-activity__amount">
                <p
                  className={
                    incoming
                      ? 'finance-activity__figure finance-activity__figure--in'
                      : 'finance-activity__figure'
                  }
                >
                  <Money
                    minor={entry.amount_minor}
                    currency={entry.currency}
                    sign={incoming ? '+' : '-'}
                  />
                </p>
                {entry.payment_method && (
                  <p className="finance-activity__method">{humanize(entry.payment_method)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {showAllLink && (
        <Link to="/finance/contributions" className="finance-activity__all">
          View All Transactions in Contributions
          <IconArrowRight width={20} height={20} />
        </Link>
      )}
    </section>
  );
}
