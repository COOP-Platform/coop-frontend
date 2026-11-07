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
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { useFinanceSummary } from '../api/summary';
import { formatAmount } from '../format';
import { Money } from './Money';
import { RecentFinancialActivity } from './RecentFinancialActivity';
import {
  ACTION_ICONS,
  AccountBalances,
  MembersActiveCard,
  QuickTreasuryActions,
} from './TreasuryPanels';
import type { QuickAction } from './TreasuryPanels';

const THIS_YEAR = new Date().getFullYear();

export function FinanceDashboard() {
  const navigate = useNavigate();
  const { membership, communityId, can } = useWorkspace();
  const { data: summary, isPending, error } = useFinanceSummary(communityId, THIS_YEAR);

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
      label: 'Record New Contribution',
      to: '/finance/my-contributions',
      search: { record: true },
      icon: ACTION_ICONS.contribution,
      tone: 'brand',
    });
  }
  if (canRecordExpense) {
    actions.push({
      label: 'Record Community Expense',
      to: '/finance/expenses',
      icon: ACTION_ICONS.expense,
      tone: 'warning',
    });
  }
  actions.push({
    label: 'Generate Monthly Statement',
    to: '/finance/statements',
    icon: ACTION_ICONS.statement,
    tone: 'info',
  });

  const behind = summary.outstanding_count;

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <span className="eyebrow eyebrow--muted">
            Ledger Overview
            <span className="eyebrow__live">
              <span className="eyebrow__dot" aria-hidden="true" />
              Live
            </span>
          </span>
        }
        title="Finance"
        subtitle={`Keep track of contributions, expenses, and financial records${
          membership ? ` for ${membership.community.name}` : ''
        }.`}
        actions={
          <>
            {canRecordExpense && (
              <Button
                variant="secondary"
                inline
                icon={<IconSend />}
                onClick={() => void navigate({ to: '/finance/expenses' })}
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

      <div className="stat-grid stat-grid--four">
        <StatCard
          label="Total Contributions"
          value={<Money minor={summary.total_contributions_minor} currency={currency} />}
          caption={
            summary.total_income_minor > 0
              ? `Confirmed in ${summary.year}, plus ${formatAmount(summary.total_income_minor)} ${currency} other income`
              : `Confirmed payments in ${summary.year}`
          }
          icon={<IconWallet />}
          tone="info"
        />
        <StatCard
          label="Total Expenses"
          value={<Money minor={summary.total_expenses_minor} currency={currency} />}
          caption={`Approved spending in ${summary.year}`}
          icon={<IconFile />}
          tone="info"
        />
        <StatCard
          label="Outstanding"
          value={<Money minor={summary.outstanding_minor} currency={currency} />}
          caption={
            behind === 0
              ? 'Every member is up to date'
              : `${behind} member${behind === 1 ? '' : 's'} still owe for ${summary.year}`
          }
          icon={<IconClipboardClock />}
          tone="warning"
        />
        <StatCard
          label="Current Balance"
          value={<Money minor={summary.current_balance_minor} currency={currency} />}
          caption="Community wallet: money in less money out, to date"
          icon={<IconInstitution />}
          tone="brand"
          highlight
        />
      </div>

      <div className="finance-grid">
        <div className="finance-grid__main">
          {summary.recent_activity !== null && (
            <RecentFinancialActivity
              entries={summary.recent_activity}
              showAllLink={canViewContributions}
            />
          )}
        </div>

        <aside className="finance-grid__side">
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
        </aside>
      </div>
    </div>
  );
}
