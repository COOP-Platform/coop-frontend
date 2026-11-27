import { PageHeader, SegmentedControl } from '@/components/ui';
import { useWorkspace } from '@/features/auth';

import { BudgetsPage } from './BudgetsPage';
import { CashFlowStatement } from './CashFlowStatement';
import { ExpensesPage } from './ExpensesPage';
import { IncomePage } from './IncomePage';
import { SharesPage } from './SharesPage';

/*
 * The Finance sidebar groups related pages into one link with tabs:
 *   Expenses & Income  -> Expenses · Income
 *   Budgets & Shares   -> Budgets · Dedicated contributions · Shares
 *   Reports            -> the cash flow statement only
 * Each tab is the page it replaced, shown embedded (its header becomes a
 * section bar), and has its own address through ?tab=.
 */

function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return <SegmentedControl label="Section" options={options} value={value} onChange={onChange} />;
}

// ---------------------------------------------------------------------------
// Expenses & Income
// ---------------------------------------------------------------------------

export type MoneyFlowTab = 'expenses' | 'income';

export function ExpensesIncomePage({
  tab,
  record,
  onTabChange,
}: {
  tab: MoneyFlowTab;
  /** Open the tab's Record form on arrival. */
  record: boolean;
  onTabChange: (tab: MoneyFlowTab) => void;
}) {
  const { can } = useWorkspace();
  const options: { value: MoneyFlowTab; label: string }[] = [
    ...(can('finance.expense.view') ? [{ value: 'expenses' as const, label: 'Expenses' }] : []),
    ...(can('finance.income.view') ? [{ value: 'income' as const, label: 'Income' }] : []),
  ];
  const current = options.some((o) => o.value === tab) ? tab : (options[0]?.value ?? 'expenses');

  return (
    <div className="page">
      <PageHeader title="Expenses & Income" />
      <Tabs options={options} value={current} onChange={onTabChange} />
      {current === 'expenses' ? (
        <ExpensesPage key="expenses" embedded startRecording={record} />
      ) : (
        <IncomePage key="income" embedded startRecording={record} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budgets & Shares
// ---------------------------------------------------------------------------

export type PlanningTab = 'budgets' | 'campaigns' | 'shares';

export function BudgetsSharesPage({
  tab,
  onTabChange,
}: {
  tab: PlanningTab;
  onTabChange: (tab: PlanningTab) => void;
}) {
  const { can } = useWorkspace();
  const options: { value: PlanningTab; label: string }[] = [
    ...(can('finance.budget.view') ? [{ value: 'budgets' as const, label: 'Budgets' }] : []),
    { value: 'shares', label: 'Shares' },
  ];
  // Collections now live with the budgets: an old "campaigns" link opens Budgets.
  const wanted = tab === 'campaigns' ? 'budgets' : tab;
  const current = options.some((o) => o.value === wanted)
    ? wanted
    : (options[0]?.value ?? 'shares');

  return (
    <div className="page">
      <PageHeader title="Budgets & Shares" />
      <Tabs options={options} value={current} onChange={onTabChange} />
      {current === 'shares' ? <SharesPage embedded /> : <BudgetsPage embedded />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

/** Finance reports: the cash flow statement (By category and Years were dropped). */
export function ReportsHubPage() {
  return (
    <div className="page">
      <PageHeader title="Reports" />
      <CashFlowStatement embedded />
    </div>
  );
}
