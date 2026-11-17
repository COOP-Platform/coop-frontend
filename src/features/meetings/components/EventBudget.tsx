import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconBanknote,
  IconCheckCircle,
  IconFlag,
  IconHandHeart,
  IconPiggyBank,
  IconPlusCircle,
  IconSend,
  IconUsers,
  IconWallet,
  LoadingState,
  SectionCard,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import {
  BudgetFormDialog,
  CampaignFormDialog,
  Money,
  RecordContributionDialog,
  RecordExpenseDialog,
  formatAmount,
  useBudgetDetail,
  useCampaigns,
} from '@/features/finance';
import type { BudgetDetail, Campaign } from '@/features/finance';
import { errorMessage } from '@/lib/api/errors';

import type { CommunityEvent } from '../api/events';

/**
 * The event's budget at a glance: planned, from members, from the community
 * pocket, and what is left. Shown only when the event has a budget the caller
 * may read; it shares the budget query with `EventBudget` below.
 */
export function EventBudgetStats({ event }: { event: CommunityEvent }) {
  const { communityId, can } = useWorkspace();
  const visible = event.budget !== null && can('finance.budget.view');
  const budget = useBudgetDetail(communityId, visible ? event.budget?.id : undefined);
  if (!visible || !budget.data) return null;
  const b = budget.data;
  return (
    <div className="stat-grid">
      <StatCard
        label="Budget"
        value={<Money minor={b.planned_minor} currency={b.currency} />}
        caption={`Spent ${formatAmount(b.spent_minor)}`}
        icon={<IconWallet />}
        tone="brand"
      />
      <StatCard
        label="From members"
        value={<Money minor={b.raised_minor} currency={b.currency} />}
        icon={<IconUsers />}
        tone="info"
      />
      <StatCard
        label="From pocket"
        value={<Money minor={b.from_wallet_minor} currency={b.currency} />}
        icon={<IconPiggyBank />}
        tone="accent"
      />
      <StatCard
        label="Left"
        value={<Money minor={b.left_to_spend_minor} currency={b.currency} />}
        caption={
          b.pending_spent_minor > 0
            ? `${formatAmount(b.pending_spent_minor)} awaiting approval`
            : undefined
        }
        icon={<IconBanknote />}
        tone="warning"
        emphasis={b.left_to_spend_minor < 0}
      />
    </div>
  );
}

/**
 * An event's money, on its page: the budget lines planned for it, and the
 * contributions members are asked for.
 *
 * - No budget yet: whoever manages budgets plans one for this event.
 * - Members pay into its dedicated contributions ("Contribute").
 * - Spending beyond what members raised comes from the community pocket;
 *   whoever records expenses takes it from there ("Use pocket money"),
 *   and someone else approves it as for any expense.
 */
export function EventBudget({ event }: { event: CommunityEvent }) {
  const { communityId, can } = useWorkspace();
  const queryClient = useQueryClient();
  const [planning, setPlanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const cancelled = event.status === 'cancelled';
  const canPlan = can('finance.budget.manage') && !cancelled;

  // The event carries its budget's id; refresh it once a budget is planned.
  function refreshEvent(message: string) {
    setPlanning(false);
    setNotice(message);
    void queryClient.invalidateQueries({ queryKey: ['meetings', communityId] });
  }

  return (
    <>
      {notice && (
        <div className="notice notice--success event-detail__wide" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <p className="notice__text">{notice}</p>
        </div>
      )}

      {event.budget === null ? (
        <SectionCard
          title="Budget"
          className="event-detail__wide"
          actions={
            canPlan ? (
              <Button inline icon={<IconFlag />} onClick={() => setPlanning(true)}>
                Plan a budget
              </Button>
            ) : undefined
          }
        >
          <p className="table__muted">{cancelled ? 'Cancelled: no budget.' : 'No budget yet.'}</p>
        </SectionCard>
      ) : !can('finance.budget.view') ? (
        <SectionCard title="Budget" className="event-detail__wide">
          <p>{event.budget.title}</p>
        </SectionCard>
      ) : (
        <BudgetBody budgetId={event.budget.id} onNotice={setNotice} />
      )}

      <BudgetFormDialog
        open={planning}
        budget={null}
        event={{ id: event.id, title: event.title }}
        onClose={() => setPlanning(false)}
        onSaved={(message) => refreshEvent(message)}
      />
    </>
  );
}

function BudgetBody({
  budgetId,
  onNotice,
}: {
  budgetId: string;
  onNotice: (message: string) => void;
}) {
  const { communityId, can } = useWorkspace();
  const budget = useBudgetDetail(communityId, budgetId);
  const campaigns = useCampaigns(communityId, 'open');
  const [asking, setAsking] = useState(false);
  const [taking, setTaking] = useState(false);
  const [paying, setPaying] = useState<Campaign | null>(null);

  if (budget.isPending || budget.error) {
    return (
      <SectionCard title="Budget" className="event-detail__wide">
        {budget.error ? (
          <ErrorState title="Couldn't load the budget" message={errorMessage(budget.error)} />
        ) : (
          <LoadingState label="Loading the budget…" />
        )}
      </SectionCard>
    );
  }
  const b = budget.data;
  const open = b.status === 'active';
  // Open contributions for this budget, with the caller's own share.
  const mine = (campaigns.data?.items ?? []).filter((c) => c.budget?.id === b.id);
  const canAsk = open && can('finance.campaign.manage');
  const canTake = open && can('finance.expense.record');

  return (
    <>
      <BudgetLines budget={b} />

      <SectionCard
        title="Contributions"
        className="event-detail__wide"
        flush={b.campaigns.length > 0}
        actions={
          canAsk || canTake ? (
            <>
              {canAsk && (
                <Button inline icon={<IconPlusCircle />} onClick={() => setAsking(true)}>
                  Ask members
                </Button>
              )}
              {canTake && (
                <Button
                  inline
                  variant="secondary"
                  icon={<IconSend />}
                  onClick={() => setTaking(true)}
                >
                  Use pocket money
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {b.campaigns.length === 0 ? (
          <EmptyState icon={<IconHandHeart />} title="No contributions yet" />
        ) : (
          <ul className="event-budget__campaigns" role="list">
            {b.campaigns.map((c) => {
              const share = mine.find((m) => m.id === c.id)?.my_share;
              return (
                <li key={c.id} className="event-budget__campaign">
                  <div>
                    <p className="event-budget__campaign-title">
                      {c.title}{' '}
                      <Badge tone={c.status === 'open' ? 'success' : 'neutral'}>
                        {c.status === 'open' ? 'Open' : 'Closed'}
                      </Badge>{' '}
                      <Badge tone="neutral">{c.required ? 'Required' : 'Voluntary'}</Badge>
                    </p>
                    <p className="table__muted">
                      {formatAmount(c.amount_minor)} {b.currency}{' '}
                      {c.charge === 'per_share' ? 'per share' : 'per member'}
                      {c.due_date && ` · due ${c.due_date}`} · {formatAmount(c.collected_minor)}
                      {c.expected_minor !== null && ` of ${formatAmount(c.expected_minor)}`}{' '}
                      collected
                    </p>
                    {share && (
                      <p className="event-budget__mine">
                        {share.outstanding_minor !== null && share.outstanding_minor > 0
                          ? `You owe ${formatAmount(share.outstanding_minor)} ${b.currency}`
                          : share.paid_minor > 0
                            ? `You paid ${formatAmount(share.paid_minor)} ${b.currency}`
                            : 'Not paid yet'}
                        {share.pending_minor > 0 &&
                          ` · ${formatAmount(share.pending_minor)} ${b.currency} pending`}
                      </p>
                    )}
                  </div>
                  {c.status === 'open' && share && can('finance.contribution.record') && (
                    <Button
                      inline
                      variant="secondary"
                      icon={<IconHandHeart />}
                      onClick={() => setPaying(mine.find((m) => m.id === c.id) ?? null)}
                    >
                      Contribute
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <CampaignFormDialog
        open={asking}
        campaign={null}
        budgetId={b.id}
        onClose={() => setAsking(false)}
        onSaved={(message) => {
          setAsking(false);
          onNotice(message);
        }}
      />
      <RecordExpenseDialog
        open={taking}
        budgetId={b.id}
        onClose={() => setTaking(false)}
        onRecorded={() => {
          setTaking(false);
          onNotice('Expense recorded. It counts once someone else approves it.');
        }}
      />
      <RecordContributionDialog
        open={paying !== null}
        shares={undefined}
        initial={
          paying
            ? {
                type: 'dedicated',
                campaignId: paying.id,
                amountMinor:
                  paying.my_share.outstanding_minor ??
                  paying.my_share.owed_minor ??
                  paying.amount_minor,
              }
            : undefined
        }
        onClose={() => setPaying(null)}
        onRecorded={() => {
          setPaying(null);
          onNotice('Contribution sent. It counts once the Treasurer confirms it.');
        }}
      />
    </>
  );
}

function BudgetLines({ budget: b }: { budget: BudgetDetail }) {
  return (
    <SectionCard
      title="Budget"
      className="event-detail__wide"
      flush={b.lines.length > 0}
      footer={
        <Link to="/finance/planning" className="event-budget__more">
          Open in Budgets
        </Link>
      }
    >
      {b.lines.length === 0 ? (
        <EmptyState icon={<IconWallet />} title="No budget lines" />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Line</th>
                <th scope="col" className="num">
                  Planned
                </th>
                <th scope="col" className="num">
                  Spent
                </th>
                <th scope="col" className="num">
                  Left
                </th>
                <th scope="col" className="event-budget__used-col">
                  Used
                </th>
              </tr>
            </thead>
            <tbody>
              {b.lines.map((line) => (
                <tr key={line.id}>
                  <td>{line.title}</td>
                  <td className="num">{formatAmount(line.planned_minor)}</td>
                  <td className="num">{formatAmount(line.spent_minor)}</td>
                  <td className="num">{formatAmount(line.left_to_spend_minor)}</td>
                  <td>
                    <UsedBar spent={line.spent_minor} planned={line.planned_minor} />
                  </td>
                </tr>
              ))}
              {b.unallocated_spent_minor > 0 && (
                <tr>
                  <td>Other spending</td>
                  <td className="num">—</td>
                  <td className="num">{formatAmount(b.unallocated_spent_minor)}</td>
                  <td className="num">—</td>
                  <td />
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="event-budget__total">
                <th scope="row">Total ({b.currency})</th>
                <td className="num">{formatAmount(b.planned_minor)}</td>
                <td className="num">{formatAmount(b.spent_minor)}</td>
                <td className="num">{formatAmount(b.left_to_spend_minor)}</td>
                <td>
                  <UsedBar spent={b.spent_minor} planned={b.planned_minor} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

/** A thin bar: how much of the planned amount is spent. */
function UsedBar({ spent, planned }: { spent: number; planned: number }) {
  const percent = planned > 0 ? Math.round((spent / planned) * 100) : 0;
  return (
    <span className="report-bar">
      <span className="report-bar__track" aria-hidden="true">
        <span
          className={
            percent > 100 ? 'report-bar__fill report-bar__fill--short' : 'report-bar__fill'
          }
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </span>
      <span className="report-bar__value">{percent}%</span>
    </span>
  );
}
