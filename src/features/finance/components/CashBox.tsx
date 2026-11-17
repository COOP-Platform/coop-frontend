import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import {
  ErrorState,
  IconInstitution,
  IconPiggyBank,
  IconSend,
  IconWallet,
  LoadingState,
  SectionCard,
  StatCard,
} from '@/components/ui';
import type { IconTileTone } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { useCashFlow, useCashFlowItems } from '../api/cashflow';
import { formatAmount } from '../format';
import { THIS_MONTH } from '../month';
import { formatShortDate } from '@/lib/format/date';
import { Money } from './Money';

/** The backend keeps no money record before 2020, so this covers everything. */
const SINCE = '2020-01-01';
/** Records listed under each source. */
const LATEST = 3;
const today = () => new Date().toLocaleDateString('en-CA');
const records = (n: number) => `${n} record${n === 1 ? '' : 's'}`;

/** All-time total of one kind of record (the summary covers every page), and its latest few. */
function useAllTime(
  communityId: string | undefined,
  source: 'contribution' | 'income' | 'expense',
) {
  return useCashFlowItems(communityId, {
    source,
    from_date: SINCE,
    to_date: today(),
    page_size: LATEST,
  });
}

/**
 * All the money in the community's pocket, and where it came from:
 * contributions + other income - expenses = cash in hand. Every member sees
 * the same numbers; only confirmed contributions, recorded income and
 * approved expenses count.
 */
export function CashBox() {
  const { communityId, can } = useWorkspace();
  const wallet = useCashFlow(communityId, THIS_MONTH, THIS_MONTH);
  const contributions = useAllTime(communityId, 'contribution');
  const income = useAllTime(communityId, 'income');
  const expenses = useAllTime(communityId, 'expense');

  const failed = [wallet, contributions, income, expenses].find((part) => part.error);
  if (failed) return <ErrorState message={errorMessage(failed.error)} />;
  if (
    wallet.data === undefined ||
    contributions.data === undefined ||
    income.data === undefined ||
    expenses.data === undefined
  ) {
    return <LoadingState label="Counting the money…" />;
  }

  const currency = wallet.data.currency;
  const sources: {
    label: string;
    minor: number;
    count: number;
    items: typeof contributions.data.items;
    sign: '+' | '-';
    tone: IconTileTone;
    icon: ReactNode;
    link: ReactNode;
  }[] = [
    {
      label: 'Contributions',
      minor: contributions.data.summary.money_in_minor,
      count: contributions.data.summary.in_count,
      items: contributions.data.items,
      sign: '+',
      tone: 'info',
      icon: <IconWallet />,
      link: (
        <Link to="/finance/money" search={{ tab: 'payments' }}>
          See payments
        </Link>
      ),
    },
    {
      label: 'Other income',
      minor: income.data.summary.money_in_minor,
      count: income.data.summary.in_count,
      items: income.data.items,
      sign: '+',
      tone: 'accent',
      icon: <IconPiggyBank />,
      link: (
        <Link to="/finance/expenses-income" search={{ tab: 'income' }}>
          See income
        </Link>
      ),
    },
    {
      label: 'Expenses',
      minor: expenses.data.summary.money_out_minor,
      count: expenses.data.summary.out_count,
      items: expenses.data.items,
      sign: '-',
      tone: 'warning',
      icon: <IconSend />,
      link: <Link to="/finance/expenses-income">See expenses</Link>,
    },
  ];

  return (
    <div className="money-section">
      <div className="stat-grid">
        <StatCard
          label="Community pocket"
          value={<Money minor={wallet.data.wallet_balance_minor} currency={currency} />}
          caption="All time"
          icon={<IconInstitution />}
          tone="brand"
        />
        {sources.map((source) => (
          <StatCard
            key={source.label}
            label={source.label}
            value={
              <Money
                minor={source.minor}
                currency={currency}
                sign={source.minor > 0 ? source.sign : undefined}
              />
            }
            caption={records(source.count)}
            icon={source.icon}
            tone={source.tone}
          />
        ))}
      </div>

      <SectionCard
        title="Latest"
        actions={
          (can('finance.income.record') || can('finance.expense.record')) && (
            <>
              {can('finance.income.record') && (
                <Link
                  to="/finance/expenses-income"
                  search={{ tab: 'income', record: true }}
                  className="btn btn--secondary btn--inline btn--sm"
                >
                  <IconPiggyBank width={16} height={16} aria-hidden="true" /> Add income
                </Link>
              )}
              {can('finance.expense.record') && (
                <Link
                  to="/finance/expenses-income"
                  search={{ record: true }}
                  className="btn btn--secondary btn--inline btn--sm"
                >
                  <IconSend width={16} height={16} aria-hidden="true" /> Record expense
                </Link>
              )}
            </>
          )
        }
      >
        <ul className="cash-box__sources" role="list" aria-label="Where the money comes from">
          {sources.map((source) => (
            <li
              key={source.label}
              className={`cash-box__source cash-box__source--${source.sign === '+' ? 'in' : 'out'}`}
            >
              <span className="cash-box__source-label">{source.label}</span>
              {source.items.length > 0 ? (
                <ul
                  className="cash-box__latest"
                  role="list"
                  aria-label={`Latest ${source.label.toLowerCase()}`}
                >
                  {source.items.map((item) => (
                    <li key={item.source.id}>
                      <span className="cash-box__latest-who">{item.party ?? item.narrative}</span>
                      <span className="cash-box__latest-amount">
                        {formatAmount(item.amount_minor)}
                      </span>
                      <span className="table__muted">{formatShortDate(item.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="table__muted">None yet</span>
              )}
              <span className="cash-box__link">{source.link}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
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
        <strong>Community pocket: </strong>
        {flow.data.currency} {formatAmount(flow.data.wallet_balance_minor)}{' '}
        <Link to="/finance/money" search={{ tab: 'pocket' }} className="cash-box__link">
          See sources
        </Link>
      </p>
    </div>
  );
}
