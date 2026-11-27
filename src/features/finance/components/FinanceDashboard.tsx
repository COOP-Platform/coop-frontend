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
import { reviewsContributions, reviewsExpenses, useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { useCashFlow } from '../api/cashflow';
import { useMonthSummaries } from '../api/contributions';
import { useFinanceSummary } from '../api/summary';
import { THIS_MONTH } from '../month';
import { addMonths } from '../period';
import { Money } from './Money';
import { RecentFinancialActivity } from './RecentFinancialActivity';
import { CollectedBars } from './StatementCharts';
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
/** The six months of the collected-vs-expected chart, oldest first. */
const CHART_MONTHS = [5, 4, 3, 2, 1, 0].map((back) => addMonths(THIS_MONTH, -back));

export function FinanceDashboard() {
  const navigate = useNavigate();
  const { membership, communityId, can } = useWorkspace();
  const { data: summary, isPending, error } = useFinanceSummary(communityId, THIS_YEAR);
  // Every member reads the cash box (finance.cashflow.view); without it, no request.
  const canViewCashFlow = can('finance.cashflow.view');
  const cashFlow = useCashFlow(canViewCashFlow ? communityId : undefined, CHART_FROM, THIS_MONTH);
  // Collected vs expected per month: what a savings group watches.
  const collected = useMonthSummaries(
    can('finance.contribution.view') ? communityId : undefined,
    CHART_MONTHS,
  );

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
        {can('finance.contribution.view') && (
          <SectionCard
            title="Contributions: collected vs expected"
            actions={
              <p className="chart-legend">
                <span>
                  <span className="legend-swatch legend-swatch--in" aria-hidden="true" /> Collected
                </span>
                <span>
                  <span className="legend-swatch legend-swatch--expected" aria-hidden="true" />{' '}
                  Expected
                </span>
              </p>
            }
          >
            {collected.every((q) => q.data) ? (
              <CollectedBars
                months={collected.map((q, i) => ({
                  month: CHART_MONTHS[i] ?? '',
                  expected_minor: q.data?.summary.expected_minor ?? 0,
                  received_minor: q.data?.summary.received_minor ?? 0,
                  paid_count: q.data?.summary.paid_count ?? 0,
                  member_count: q.data?.summary.member_count ?? 0,
                }))}
              />
            ) : collected.some((q) => q.error) ? (
              <ErrorState message={errorMessage(collected.find((q) => q.error)?.error)} />
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

      {/* Recent activity is for whoever reviews money, not every member. */}
      {summary.recent_activity !== null && (reviewsContributions(can) || reviewsExpenses(can)) && (
        <RecentFinancialActivity
          entries={summary.recent_activity}
          showAllLink={canViewContributions}
        />
      )}
    </div>
  );
}
