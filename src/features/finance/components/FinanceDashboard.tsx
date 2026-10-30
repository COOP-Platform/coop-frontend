import { useNavigate } from '@tanstack/react-router';

import {
  Badge,
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
import { Money } from './Money';
import { RecentFinancialActivity } from './RecentFinancialActivity';
import {
  ACTION_ICONS,
  AccountBalances,
  MembersActiveCard,
  QuickTreasuryActions,
} from './TreasuryPanels';
import type { QuickAction } from './TreasuryPanels';

export function FinanceDashboard() {
  const navigate = useNavigate();
  const { membership, communityId, can } = useWorkspace();
  const { summary, isSample, isPending, error } = useFinanceSummary(communityId);

  // Every member may record their own payment; spending the community's money
  // is the Treasurer's. The backend refuses it for anyone else regardless.
  const canRecordContribution = can('finance.contribution.record');
  const canRecordExpense = can('finance.expense.record');
  const canViewContributions = can('finance.contribution.view');
  // Who paid what, and where the money sits, is for those who manage it —
  // other members see the totals only (Sprint 3-5 brief).
  const canViewLedger = canViewContributions || can('finance.expense.view');

  if (isPending) return <LoadingState />;
  if (summary === undefined) return <ErrorState message={errorMessage(error)} />;

  const actions: QuickAction[] = [];
  if (canRecordContribution) {
    actions.push({
      label: 'Record New Contribution',
      to: '/finance/my-contributions',
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

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <span className="eyebrow eyebrow--muted">
            Ledger Overview
            {isSample ? (
              <Badge tone="warning">Sample figures</Badge>
            ) : (
              <span className="eyebrow__live">
                <span className="eyebrow__dot" aria-hidden="true" />
                Live
              </span>
            )}
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
                onClick={() => void navigate({ to: '/finance/my-contributions' })}
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
          value={<Money value={summary.total_contributions} />}
          caption={`Collected across ${summary.members.active} members this year`}
          icon={<IconWallet />}
          tone="info"
        />
        <StatCard
          label="Total Expenses"
          value={<Money value={summary.total_expenses} />}
          caption="Operational & community support costs"
          icon={<IconFile />}
          tone="info"
        />
        <StatCard
          label="Outstanding"
          value={<Money value={summary.outstanding} />}
          caption={`${summary.outstanding_count} pending cycle payments`}
          icon={<IconClipboardClock />}
          tone="warning"
        />
        <StatCard
          label="Current Balance"
          value={<Money value={summary.current_balance} />}
          caption="Net available cash across accounts"
          icon={<IconInstitution />}
          tone="brand"
          highlight
          badge={<Badge tone="success">Liquid</Badge>}
        />
      </div>

      <div className="finance-grid">
        <div className="finance-grid__main">
          {canViewLedger && (
            <RecentFinancialActivity
              entries={summary.recent_activity}
              showAllLink={canViewContributions}
            />
          )}
        </div>

        <aside className="finance-grid__side">
          <QuickTreasuryActions actions={actions} />
          {canViewLedger && <AccountBalances accounts={summary.accounts} />}
          <MembersActiveCard members={summary.members} />
        </aside>
      </div>
    </div>
  );
}
