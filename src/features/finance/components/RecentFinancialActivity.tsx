import { Link } from '@tanstack/react-router';

import { Badge, EmptyState, IconArrowRight, IconHistory, IconTile } from '@/components/ui';
import { formatLongDate } from '@/lib/format/date';

import type { FinanceActivity } from '../api/summary';
import { Money } from './Money';

interface RecentFinancialActivityProps {
  entries: readonly FinanceActivity[];
  /** The full list lives on the Contributions page; only linked for those who can open it. */
  showAllLink: boolean;
}

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
          message="Confirmed contributions and recorded expenses will show here."
        />
      )}

      <ul className="finance-activity__list" role="list">
        {entries.map((entry) => {
          const incoming = entry.direction === 'IN';
          return (
            <li key={entry.id} className="finance-activity__item">
              <IconTile tone={incoming ? 'brand' : 'warning'} round size="md">
                <IconArrowRight
                  className={incoming ? 'finance-arrow finance-arrow--in' : 'finance-arrow'}
                />
              </IconTile>

              <div className="finance-activity__body">
                <p className="finance-activity__title">
                  {entry.title}
                  <Badge tone={incoming ? 'success' : 'warning'}>
                    {entry.type === 'CONTRIBUTION' ? 'Contribution' : 'Expense'}
                  </Badge>
                </p>
                <p className="finance-activity__meta">
                  {[entry.detail, incoming ? 'Paid' : 'Disbursed', formatLongDate(entry.at)]
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
                  <Money value={entry.amount} sign={incoming ? '+' : '-'} />
                </p>
                {entry.method && <p className="finance-activity__method">{entry.method}</p>}
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
