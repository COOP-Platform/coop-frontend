import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  Badge,
  Button,
  ErrorState,
  IconFlag,
  IconHandHeart,
  IconPlusCircle,
  IconSend,
  LoadingState,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import {
  BudgetFormDialog,
  CampaignFormDialog,
  Meter,
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
 * An event's money, on its page: the budget planned for it, what members
 * contributed to it, and what was taken from the community pocket.
 *
 * - No budget yet: whoever manages budgets plans one for this event.
 * - Members pay into its dedicated contributions ("Contribute").
 * - Spending beyond what members raised comes from the community pocket;
 *   whoever records expenses takes it from there ("Take from the pocket"),
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
    <section className="card event-budget" aria-labelledby="event-budget-title">
      <header className="event-budget__head">
        <div>
          <h2 id="event-budget-title" className="section-head__title">
            Budget and contributions
          </h2>
          <p className="section-head__subtitle">
            What this event costs, what members put in, and what comes from the community pocket.
          </p>
        </div>
      </header>

      {notice && (
        <p className="event-budget__notice" role="status">
          {notice}
        </p>
      )}

      {event.budget === null ? (
        <div className="event-budget__empty">
          <p className="table__muted">
            {cancelled
              ? 'This event is cancelled, so it has no budget.'
              : 'No budget is planned for this event yet.'}
          </p>
          {canPlan && (
            <Button inline icon={<IconFlag />} onClick={() => setPlanning(true)}>
              Plan a budget for this event
            </Button>
          )}
        </div>
      ) : !can('finance.budget.view') ? (
        <p className="table__muted">This event has a budget: {event.budget.title}.</p>
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
    </section>
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

  if (budget.isPending) return <LoadingState label="Loading the budget…" />;
  if (budget.error)
    return <ErrorState title="Couldn't load the budget" message={errorMessage(budget.error)} />;
  const b = budget.data;
  const open = b.status === 'active';
  // Open contributions for this budget, with the caller's own share.
  const mine = (campaigns.data?.items ?? []).filter((c) => c.budget?.id === b.id);

  return (
    <>
      <div className="event-budget__figures">
        <Figure label="Planned" minor={b.planned_minor} currency={b.currency} />
        <Figure label="Members contributed" minor={b.raised_minor} currency={b.currency} />
        <Figure
          label="From the community pocket"
          minor={b.from_wallet_minor}
          currency={b.currency}
          hint="Spent beyond what members contributed"
        />
        <Figure
          label="Left to spend"
          minor={b.left_to_spend_minor}
          currency={b.currency}
          warn={b.left_to_spend_minor < 0}
        />
      </div>

      <div className="event-budget__meters">
        <Meter
          label="Contributed so far"
          value={b.raised_minor}
          of={b.planned_minor}
          currency={b.currency}
          tone="in"
        />
        <Meter
          label="Spent so far"
          value={b.spent_minor}
          of={b.planned_minor}
          currency={b.currency}
          tone="out"
        />
      </div>
      {b.pending_spent_minor > 0 && (
        <p className="table__muted">
          {formatAmount(b.pending_spent_minor)} {b.currency} of spending is waiting for approval.
        </p>
      )}

      <BudgetLines budget={b} />

      <div className="event-budget__block">
        <h3 className="details__subhead">Contributions for this event</h3>
        {b.campaigns.length === 0 ? (
          <p className="table__muted">
            Members have not been asked to contribute yet.
            {open && can('finance.campaign.manage') && ' Ask them below.'}
          </p>
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
                      {b.currency} collected
                    </p>
                    {share && (
                      <p className="event-budget__mine">
                        {share.outstanding_minor !== null && share.outstanding_minor > 0
                          ? `You still owe ${formatAmount(share.outstanding_minor)} ${b.currency}.`
                          : share.paid_minor > 0
                            ? `You paid ${formatAmount(share.paid_minor)} ${b.currency}. Thank you!`
                            : 'You have not contributed yet.'}
                        {share.pending_minor > 0 &&
                          ` ${formatAmount(share.pending_minor)} ${b.currency} is waiting for the Treasurer.`}
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
      </div>

      {open && (can('finance.campaign.manage') || can('finance.expense.record')) && (
        <div className="event-budget__actions">
          {can('finance.campaign.manage') && (
            <Button inline icon={<IconPlusCircle />} onClick={() => setAsking(true)}>
              Ask members to contribute
            </Button>
          )}
          {can('finance.expense.record') && (
            <Button inline variant="secondary" icon={<IconSend />} onClick={() => setTaking(true)}>
              Take money from the community pocket
            </Button>
          )}
        </div>
      )}
      {open && can('finance.expense.record') && (
        <p className="table__muted event-budget__explain">
          Taking money from the pocket records an expense for this event. It counts once someone
          else approves it; what members contributed is used first, the rest comes from the pocket.
        </p>
      )}

      <p className="event-budget__more">
        <Link to="/finance/planning">Open it in Budgets & Shares</Link>
      </p>

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
          onNotice('Expense recorded for this event. It counts once someone else approves it.');
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
          onNotice('Contribution sent. The Treasurer confirms it, then it counts for this event.');
        }}
      />
    </>
  );
}

function Figure({
  label,
  minor,
  currency,
  hint,
  warn = false,
}: {
  label: string;
  minor: number;
  currency: string;
  hint?: string;
  warn?: boolean;
}) {
  return (
    <div className={`event-budget__figure${warn ? ' is-warn' : ''}`}>
      <p className="event-budget__figure-label">{label}</p>
      <p className="event-budget__figure-value">
        <Money minor={minor} currency={currency} />
      </p>
      {hint && <p className="table__muted event-budget__figure-hint">{hint}</p>}
    </div>
  );
}

function BudgetLines({ budget }: { budget: BudgetDetail }) {
  if (budget.lines.length === 0) return null;
  return (
    <div className="event-budget__block">
      <h3 className="details__subhead">What it pays for</h3>
      <div className="table-scroll">
        <table className="table table--compact">
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col" className="table__amount">
                Planned
              </th>
              <th scope="col" className="table__amount">
                Spent
              </th>
              <th scope="col" className="table__amount">
                Left
              </th>
            </tr>
          </thead>
          <tbody>
            {budget.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.title}</td>
                <td className="table__amount">{formatAmount(line.planned_minor)}</td>
                <td className="table__amount">{formatAmount(line.spent_minor)}</td>
                <td className="table__amount">{formatAmount(line.left_to_spend_minor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
