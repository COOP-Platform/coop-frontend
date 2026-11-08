import { PageHeader, SegmentedControl } from '@/components/ui';
import { useWorkspace } from '@/features/auth';

import { BudgetsPage } from './BudgetsPage';
import { CashFlowStatement } from './CashFlowStatement';
import { ExpensesPage } from './ExpensesPage';
import { IncomePage } from './IncomePage';
import { ReportsPage } from './ReportsPage';
import { SharesPage } from './SharesPage';

/*
 * The Finance sidebar groups related pages into one link with tabs:
 *   Expenses & Income  -> Expenses · Income
 *   Budgets & Shares   -> Budgets · Dedicated contributions · Shares
 *   Reports            -> Cash flow statement · By category
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
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Expenses & Income"
        subtitle="Money paid out of the community, and money in that is not a member's contribution."
      />
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
    ...(can('finance.campaign.view')
      ? [{ value: 'campaigns' as const, label: 'Dedicated contributions' }]
      : []),
    { value: 'shares', label: 'Shares' },
  ];
  const current = options.some((o) => o.value === tab) ? tab : (options[0]?.value ?? 'shares');

  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Budgets & Shares"
        subtitle="What members are asked to pay: shares every month, and dedicated contributions for events and projects."
      />
      <Tabs options={options} value={current} onChange={onTabChange} />
      {current === 'shares' ? (
        <SharesPage embedded />
      ) : (
        <BudgetsPage embedded section={current} onSectionChange={onTabChange} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export type ReportsTab = 'statement' | 'categories';

const REPORT_TABS: { value: ReportsTab; label: string }[] = [
  { value: 'statement', label: 'Cash flow statement' },
  { value: 'categories', label: 'By category' },
];

export function ReportsHubPage({
  tab,
  onTabChange,
}: {
  tab: ReportsTab;
  onTabChange: (tab: ReportsTab) => void;
}) {
  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Reports"
        subtitle="The cash flow statement, and where contributions, income and expenses came from and went."
      />
      <Tabs options={REPORT_TABS} value={tab} onChange={onTabChange} />
      {tab === 'statement' ? <CashFlowStatement embedded /> : <ReportsPage embedded />}
    </div>
  );
}
