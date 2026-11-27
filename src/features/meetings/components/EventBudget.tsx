import { Link } from '@tanstack/react-router';

import {
  Badge,
  EmptyState,
  ErrorState,
  IconBanknote,
  IconFlag,
  IconHandHeart,
  IconPiggyBank,
  IconUsers,
  IconWallet,
  LoadingState,
  SectionCard,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { Money, chargeText, formatAmount, useBudgetDetail, useCampaigns } from '@/features/finance';
import type { BudgetDetail } from '@/features/finance';
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
 * An event's money, on its page: a report only. The budget lines planned for
 * it and the contributions collected. Deciding about money (planning the
 * budget, asking members, using pocket money) happens in Finance, which the
 * "Manage in Finance" / "Plan in Finance" links open on this event's budget.
 */
export function EventBudget({ event }: { event: CommunityEvent }) {
  const { can } = useWorkspace();
  const cancelled = event.status === 'cancelled';
  const canPlan = can('finance.budget.manage') && !cancelled;

  if (event.budget === null) {
    return (
      <SectionCard
        title="Budget"
        className="event-detail__wide"
        actions={
          canPlan ? (
            <Link
              to="/finance/planning"
              search={{ plan: event.id, planTitle: event.title }}
              className="btn btn--secondary btn--inline"
            >
              <IconFlag width={16} height={16} aria-hidden="true" />
              Plan in Finance
            </Link>
          ) : undefined
        }
      >
        <p className="table__muted">{cancelled ? 'Cancelled: no budget.' : 'No budget yet.'}</p>
      </SectionCard>
    );
  }
  if (!can('finance.budget.view')) {
    return (
      <SectionCard title="Budget" className="event-detail__wide">
        <p>{event.budget.title}</p>
      </SectionCard>
    );
  }
  return <BudgetBody budgetId={event.budget.id} />;
}

function BudgetBody({ budgetId }: { budgetId: string }) {
  const { communityId, can } = useWorkspace();
  const budget = useBudgetDetail(communityId, budgetId);
  const campaigns = useCampaigns(communityId, 'open');

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
  // Open contributions for this budget, with the caller's own share.
  const mine = (campaigns.data?.items ?? []).filter((c) => c.budget?.id === b.id);

  return (
    <>
      <BudgetLines budget={b} />

      <SectionCard
        title="Contributions"
        className="event-detail__wide"
        flush={b.campaigns.length > 0}
        actions={
          can('finance.report.view') ? (
            <Link
              to="/finance/budget/$budgetId"
              params={{ budgetId: b.id }}
              className="btn btn--secondary btn--inline"
            >
              <IconWallet width={16} height={16} aria-hidden="true" />
              Manage in Finance
            </Link>
          ) : undefined
        }
      >
        {b.campaigns.length === 0 ? (
          <EmptyState icon={<IconHandHeart />} title="No contributions yet" />
        ) : (
          <ul className="event-budget__campaigns" role="list">
            {b.campaigns.map((c) => {
              const share = mine.find((m) => m.id === c.id)?.my_share;
              const owes =
                c.status === 'open' &&
                share !== undefined &&
                (share.outstanding_minor === null || share.outstanding_minor > 0) &&
                can('finance.contribution.record') &&
                (can('event.create') || can('event.update'));
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
                      {chargeText(c.charge, c.amount_minor, b.currency)}
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
                  {owes && (
                    <Link
                      to="/finance/my-contributions"
                      search={{ record: true }}
                      className="btn btn--secondary btn--inline"
                    >
                      <IconHandHeart width={16} height={16} aria-hidden="true" />
                      Pay
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
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
        <Link
          to="/finance/budget/$budgetId"
          params={{ budgetId: b.id }}
          className="event-budget__more"
        >
          Open in Finance
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
