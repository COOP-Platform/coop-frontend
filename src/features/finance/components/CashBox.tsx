import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Badge,
  EmptyState,
  IconArrowRight,
  IconHistory,
  IconInstitution,
  IconPiggyBank,
  IconSend,
  IconTile,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/date';

import { useCashFlow, useCashFlowItems } from '../api/cashflow';
import { formatAmount } from '../format';
import { humanize } from '../labels';
import { THIS_MONTH, monthName } from '../month';
import { Money } from './Money';

const THIS_YEAR = Number(THIS_MONTH.slice(0, 4));
const YEAR_START = `${THIS_YEAR}-01`;
/** Months listed before "Show all". */
const RECENT_MONTHS = 6;

/** "+10,000", or a dash when nothing moved. */
const signed = (sign: string, minor: number) => (minor === 0 ? '—' : sign + formatAmount(minor));

/**
 * Money in the community's cash box and where it came from, for every
 * member: brought forward + contributions + other income - expenses = cash in
 * hand. Built from the cash flow (the same rule as the dashboard balance), so
 * the numbers always add up.
 */
export function CashBox() {
  const { communityId, can } = useWorkspace();
  const flow = useCashFlow(communityId, YEAR_START, THIS_MONTH);
  const recent = useCashFlowItems(communityId, {
    from_date: `${YEAR_START}-01`,
    to_date: new Date().toLocaleDateString('en-CA'),
    page_size: 6,
  });
  const [showAll, setShowAll] = useState(false);

  if (flow.isPending) {
    return (
      <section className="card cash-box" aria-busy="true">
        <p className="table__muted">Counting the cash box…</p>
      </section>
    );
  }
  if (flow.data === undefined) {
    return (
      <section className="card cash-box">
        <p className="table__warn" role="alert">
          {errorMessage(flow.error)}
        </p>
      </section>
    );
  }

  const { currency, months, opening_balance_minor: opening } = flow.data;
  const contributions = months.reduce((sum, m) => sum + m.money_in.contributions_minor, 0);
  const income = months.reduce((sum, m) => sum + m.money_in.income_minor, 0);
  const expenses = months.reduce((sum, m) => sum + m.money_out.expenses_minor, 0);
  const cash = flow.data.wallet_balance_minor;
  const active = [...months]
    .reverse()
    .filter((m) => m.money_in.total_minor > 0 || m.money_out.total_minor > 0);

  return (
    <section className="card cash-box" aria-labelledby="cash-box-title">
      <div className="cash-box__top">
        <div className="cash-box__balance">
          <IconTile tone="brand" size="lg">
            <IconInstitution />
          </IconTile>
          <div>
            <p className="cash-box__eyebrow">Money in the cash box</p>
            <h2 id="cash-box-title" className="cash-box__figure">
              <Money minor={cash} currency={currency} />
            </h2>
            <p className="table__muted">
              Confirmed contributions and income, less approved expenses. The same for every member.
            </p>
          </div>
        </div>

        {(can('finance.income.record') || can('finance.expense.record')) && (
          <div className="cash-box__actions">
            {can('finance.income.record') && (
              <Link
                to="/finance/income"
                search={{ record: true }}
                className="btn btn--secondary btn--inline"
              >
                <IconPiggyBank width={18} height={18} aria-hidden="true" /> Add income
              </Link>
            )}
            {can('finance.expense.record') && (
              <Link
                to="/finance/expenses"
                search={{ record: true }}
                className="btn btn--secondary btn--inline"
              >
                <IconSend width={18} height={18} aria-hidden="true" /> Record expense
              </Link>
            )}
          </div>
        )}
      </div>

      <h3 className="cash-box__subhead">Where the money comes from in {THIS_YEAR}</h3>
      <dl className="cash-box__sum">
        <div>
          <dt>Brought forward from before {THIS_YEAR}</dt>
          <dd>
            <Money minor={opening} currency={currency} />
          </dd>
        </div>
        <div className="cash-box__in">
          <dt>
            + Member contributions{' '}
            <a href="#all-title" className="cash-box__link">
              see below
            </a>
          </dt>
          <dd>
            <Money
              minor={contributions}
              currency={currency}
              sign={contributions > 0 ? '+' : undefined}
            />
          </dd>
        </div>
        <div className="cash-box__in">
          <dt>
            + Other income (donations, events, interest){' '}
            <Link to="/finance/income" className="cash-box__link">
              open
            </Link>
          </dt>
          <dd>
            <Money minor={income} currency={currency} sign={income > 0 ? '+' : undefined} />
          </dd>
        </div>
        <div className="cash-box__out">
          <dt>
            − Expenses paid out{' '}
            <Link to="/finance/expenses" className="cash-box__link">
              open
            </Link>
          </dt>
          <dd>
            <Money minor={expenses} currency={currency} sign={expenses > 0 ? '-' : undefined} />
          </dd>
        </div>
        <div className="cash-box__total">
          <dt>= Cash in hand today</dt>
          <dd>
            <Money minor={cash} currency={currency} />
          </dd>
        </div>
      </dl>

      <div className="cash-box__columns">
        <div>
          <h3 className="cash-box__subhead">Month by month</h3>
          {active.length === 0 ? (
            <p className="table__muted">No money has moved in {THIS_YEAR} yet.</p>
          ) : (
            <div className="table-scroll">
              <table className="table table--compact">
                <thead>
                  <tr>
                    <th scope="col">Month</th>
                    <th scope="col">Contributions</th>
                    <th scope="col">Income</th>
                    <th scope="col">Expenses</th>
                    <th scope="col">Cash at end ({flow.data.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll ? active : active.slice(0, RECENT_MONTHS)).map((m) => (
                    <tr key={m.month}>
                      <td>{monthName(m.month)}</td>
                      <td className="cash-box__in">
                        {signed('+', m.money_in.contributions_minor)}
                      </td>
                      <td className="cash-box__in">{signed('+', m.money_in.income_minor)}</td>
                      <td className="cash-box__out">{signed('−', m.money_out.expenses_minor)}</td>
                      <td className="table__amount">{formatAmount(m.closing_balance_minor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {active.length > RECENT_MONTHS && (
            <button
              type="button"
              className="link-action"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Show fewer months' : `Show all ${active.length} months`}
            </button>
          )}
        </div>

        <div>
          <h3 className="cash-box__subhead">Latest movements</h3>
          {recent.data && recent.data.items.length === 0 && (
            <EmptyState
              icon={<IconHistory />}
              title="Nothing yet"
              message="Confirmed contributions, income and approved expenses show here."
            />
          )}
          <ul className="cash-box__moves" role="list">
            {(recent.data?.items ?? []).map((item) => {
              const incoming = item.direction === 'in';
              return (
                <li key={`${item.source.type}-${item.source.id}`}>
                  <IconTile tone={incoming ? 'brand' : 'warning'} round size="sm">
                    <IconArrowRight
                      className={incoming ? 'finance-arrow finance-arrow--in' : 'finance-arrow'}
                    />
                  </IconTile>
                  <div className="cash-box__move-body">
                    <p className="cash-box__move-title">
                      {item.party ?? item.narrative}{' '}
                      <Badge tone={incoming ? 'success' : 'warning'}>
                        {humanize(item.source.type)}
                      </Badge>
                    </p>
                    <p className="table__muted">
                      {item.party ? `${item.narrative} · ` : ''}
                      {formatLongDate(item.date)}
                    </p>
                  </div>
                  <p className={incoming ? 'cash-box__in' : 'cash-box__out'}>
                    <Money
                      minor={item.amount_minor}
                      currency={item.currency}
                      sign={incoming ? '+' : '-'}
                    />
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** One line for the Expenses and Income pages: what is in the cash box right now. */
export function CashBoxLine() {
  const { communityId } = useWorkspace();
  const flow = useCashFlow(communityId, THIS_MONTH, THIS_MONTH);
  if (flow.data === undefined) return null;
  return (
    <div className="notice notice--info cash-box-line" role="status">
      <IconInstitution width={20} height={20} aria-hidden="true" />
      <p className="notice__text">
        <strong>Cash in hand: </strong>
        <Money minor={flow.data.wallet_balance_minor} currency={flow.data.currency} />{' '}
        <Link to="/finance/contributions" className="cash-box__link">
          where it comes from
        </Link>
      </p>
    </div>
  );
}
