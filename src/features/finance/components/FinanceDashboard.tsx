import { useNavigate } from '@tanstack/react-router';

import {
  Button,
  ErrorState,
  LoadingState,
  IconClipboardClock,
  IconFile,
  IconInstitution,
  IconPlusCircle,
  IconSend,
  IconWallet,
  PageHeader,
  SectionCard,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { useCashFlow } from '../api/cashflow';
import { useFinanceSummary } from '../api/summary';
import { THIS_MONTH } from '../month';
import { addMonths } from '../period';
import { Money } from './Money';
import { RecentFinancialActivity } from './RecentFinancialActivity';
import { CashFlowBars } from './StatementCharts';
import {
  ACTION_ICONS,
  AccountBalances,
  MembersActiveCard,
  QuickTreasuryActions,
} from './TreasuryPanels';
import type { QuickAction } from './TreasuryPanels';

const THIS_YEAR = new Date().getFullYear();
/** The chart and the trend lines: the last six months, this one included. */
const CHART_FROM = addMonths(THIS_MONTH, -5);

export function FinanceDashboard() {
  const navigate = useNavigate();
  const { membership, communityId, can } = useWorkspace();
  const { data: summary, isPending, error } = useFinanceSummary(communityId, THIS_YEAR);
  // Every member reads the cash box (finance.cashflow.view); without it, no request.
  const canViewCashFlow = can('finance.cashflow.view');
  const cashFlow = useCashFlow(canViewCashFlow ? communityId : undefined, CHART_FROM, THIS_MONTH);

  // Every member may record their own payment; spending the community's money
  // is the Treasurer's. The backend refuses it for anyone else regardless.
  const canRecordContribution = can('finance.contribution.record');
  const canRecordExpense = can('finance.expense.record');
  const canViewContributions = can('finance.contribution.view');

  if (isPending) return <LoadingState label="Loading the finance summary…" />;
  if (summary === undefined) return <ErrorState message={errorMessage(error)} />;

  const currency = summary.currency;
  const actions: QuickAction[] = [];
  if (canRecordContribution) {
    actions.push({
      label: 'Record contribution',
      to: '/finance/my-contributions',
      search: { record: true },
      icon: ACTION_ICONS.contribution,
      tone: 'brand',
    });
  }
  if (canRecordExpense) {
    actions.push({
      label: 'Record expense',
      to: '/finance/expenses-income',
      search: { record: true },
      icon: ACTION_ICONS.expense,
      tone: 'warning',
    });
  }
  actions.push({
    label: 'Monthly statement',
    to: '/finance/reports',
    icon: ACTION_ICONS.statement,
    tone: 'info',
  });

  const behind = summary.outstanding_count;
  const months = cashFlow.data?.months ?? [];
  const trendIn = months.map((m) => m.money_in.total_minor);
  const trendOut = months.map((m) => m.money_out.total_minor);
  const trendBalance = months.map((m) => m.closing_balance_minor);

  return (
    <div className="page">
      <PageHeader
        title="Finance"
        subtitle={membership?.community.name}
        actions={
          <>
            {canRecordExpense && (
              <Button
                variant="secondary"
                inline
                icon={<IconSend />}
                onClick={() =>
                  void navigate({ to: '/finance/expenses-income', search: { record: true } })
                }
              >
                Record Expense
              </Button>
            )}
            {canRecordContribution && (
              <Button
                inline
                icon={<IconPlusCircle />}
                onClick={() =>
                  void navigate({ to: '/finance/my-contributions', search: { record: true } })
                }
              >
                Record Contribution
              </Button>
            )}
          </>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Balance"
          value={<Money minor={summary.current_balance_minor} currency={currency} />}
          caption="Community wallet"
          icon={<IconInstitution />}
          tone="brand"
          trend={trendBalance}
        />
        <StatCard
          label="Money in"
          value={
            <Money
              minor={summary.total_contributions_minor + summary.total_income_minor}
              currency={currency}
            />
          }
          caption={`In ${summary.year}`}
          icon={<IconWallet />}
          tone="info"
          trend={trendIn}
        />
        <StatCard
          label="Money out"
          value={<Money minor={summary.total_expenses_minor} currency={currency} />}
          caption={`In ${summary.year}`}
          icon={<IconFile />}
          tone="warning"
          trend={trendOut}
        />
        <StatCard
          label="Outstanding"
          value={<Money minor={summary.outstanding_minor} currency={currency} />}
          caption={
            behind === 0 ? (
              'Everyone up to date'
            ) : (
              <>
                <b className="caption-warn">
                  {behind} member{behind === 1 ? '' : 's'}
                </b>{' '}
                behind
              </>
            )
          }
          icon={<IconClipboardClock />}
          tone="accent"
        />
      </div>

      <div className="statement-grid">
        {canViewCashFlow && (
          <SectionCard
            title="Money in and out"
            actions={
              <p className="chart-legend">
                <span>
                  <span className="legend-swatch legend-swatch--in" aria-hidden="true" /> In
                </span>
                <span>
                  <span className="legend-swatch legend-swatch--out" aria-hidden="true" /> Out
                </span>
              </p>
            }
          >
            {cashFlow.data ? (
              <CashFlowBars
                months={cashFlow.data.months.map((m) => ({
                  month: m.month,
                  in_minor: m.money_in.total_minor,
                  out_minor: m.money_out.total_minor,
                }))}
              />
            ) : cashFlow.error ? (
              <ErrorState message={errorMessage(cashFlow.error)} />
            ) : (
              <LoadingState />
            )}
          </SectionCard>
        )}

        <div className="finance-grid__side">
          <QuickTreasuryActions actions={actions} />
          {summary.accounts !== null && summary.accounts.length > 0 && (
            <AccountBalances
              accounts={summary.accounts}
              totalMinor={summary.accounts_total_minor}
              differenceMinor={summary.difference_from_wallet_minor}
              currency={currency}
            />
          )}
          <MembersActiveCard members={summary.members} />
        </div>
      </div>

      {summary.recent_activity !== null && (
        <RecentFinancialActivity
          entries={summary.recent_activity}
          showAllLink={canViewContributions}
        />
      )}
    </div>
  );
}
