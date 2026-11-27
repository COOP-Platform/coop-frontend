import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  IconFlag,
  IconArrowLeft,
  IconFile,
  IconHandHeart,
  IconPencil,
  IconPlus,
  IconTile,
  Input,
  LoadingState,
  SegmentedControl,
  Select,
  Textarea,
} from '@/components/ui';
import { reviewsContributions, useWorkspace } from '@/features/auth';
import { useMemberCategories } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  useBudgetDetail,
  useBudgets,
  useCampaignMembers,
  useCampaigns,
  useCloseBudget,
  useCloseCampaign,
  useCreateBudget,
  useCreateCampaign,
  useUpdateBudget,
  useUpdateCampaign,
} from '../api/budgets';
import type { Budget, BudgetDetail, Campaign, CampaignCharge } from '../api/budgets';
import { useExpenses, useRecordExpense } from '../api/expenses';
import { MINOR_PER_MAJOR, chargeText, formatAmount } from '../format';
import { CampaignPayments } from './CampaignPayments';
import { dueText, organisesEventMoney } from '../budget-goal';
import { memberStatus, yourPart } from '../your-part';
import { ProgressRing } from './ProgressRing';
import { RecordContributionDialog } from './RecordContributionDialog';
import { SuccessNotice } from './SuccessNotice';
import { SectionHeader } from './SectionHeader';

const today = () => new Date().toLocaleDateString('en-CA');
const toMinor = (rwf: string) => Math.round(Number(rwf) * MINOR_PER_MAJOR);
const toRwf = (minor: number) => String(minor / MINOR_PER_MAJOR);

/**
 * Budgets (S3-37) with their dedicated contributions (S3-38) on one page. Open
 * a budget to see its lines and contribute to its collection right there;
 * collections not tied to a budget follow the budgets. Every member reads
 * them; the Treasurer and committee (finance.budget.manage /
 * finance.campaign.manage) change them.
 */
type Period = 'open' | 'past';

const PERIODS: { value: Period; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'past', label: 'Past' },
];

export function BudgetsPage({ embedded = false }: { embedded?: boolean }) {
  const [notice, setNotice] = useState<string | null>(null);
  // Open: what is running now. Past: closed budgets and contributions, kept as a record.
  const [period, setPeriod] = useState<Period>('open');
  return (
    <div className="page">
      {/* Inside Budgets & Shares the tab already names the section: no heading. */}
      {!embedded && <SectionHeader title="Budgets" />}
      <SegmentedControl
        label="Budgets"
        options={PERIODS}
        value={period}
        onChange={(value) => {
          setNotice(null);
          setPeriod(value);
        }}
      />
      {notice && <SuccessNotice text={notice} />}
      <BudgetsSection onDone={setNotice} period={period} />
      {/* Older money asks with no budget behind them: shown as more cards, no own section. */}
      <CampaignsSection
        onDone={setNotice}
        standalone
        status={period === 'open' ? 'open' : 'closed'}
      />
    </div>
  );
}

/**
 * A thin bar for "x of y", with the numbers written beside it. `pending` (not
 * counted yet, e.g. spending waiting for approval) shows as a lighter part of
 * the bar and a line under it, so a recorded payment never looks lost.
 */
export function Meter({
  label,
  value,
  of,
  currency,
  tone,
  pending = 0,
}: {
  label: string;
  value: number;
  of: number;
  currency: string;
  tone: 'in' | 'out';
  pending?: number;
}) {
  const percent = of > 0 ? Math.min(100, (value / of) * 100) : 0;
  const waiting = of > 0 ? Math.min(100 - percent, (pending / of) * 100) : 0;
  return (
    <div className="meter">
      <div className="meter__head">
        <span>{label}</span>
        <span className="meter__value">
          {formatAmount(value)} {currency}
          {of > 0 && <span className="table__muted"> · {Math.round((value / of) * 100)}%</span>}
        </span>
      </div>
      <div className="meter__track" aria-hidden="true">
        <div className={`meter__fill meter__fill--${tone}`} style={{ width: `${percent}%` }} />
        {waiting > 0 && (
          <div
            className={`meter__fill meter__fill--pending meter__fill--${tone}`}
            style={{ width: `${waiting}%` }}
          />
        )}
      </div>
      {pending > 0 && (
        <p className="meter__pending">
          + {formatAmount(pending)} {currency} awaiting approval
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

type BudgetFilter = 'active' | 'closed';

function BudgetsSection({ onDone, period }: { onDone: (message: string) => void; period: Period }) {
  const { communityId, can } = useWorkspace();
  const canManage = can('finance.budget.manage');
  // Links from an event's page: open its budget, or plan one for it.
  const search = useSearch({ strict: false }) as {
    plan?: string;
    planTitle?: string;
  };
  const navigate = useNavigate();
  const filter: BudgetFilter = period === 'open' ? 'active' : 'closed';
  const [creating, setCreating] = useState(false);
  const [planEvent, setPlanEvent] = useState<{ id: string; title: string } | null>(
    search.plan && canManage ? { id: search.plan, title: search.planTitle ?? 'Event' } : null,
  );
  const budgets = useBudgets(communityId, filter);
  // Which budgets are asking members for money right now.
  const openCollections = useCampaigns(communityId, period === 'open' ? 'open' : 'closed');
  const askingFor = (budgetId: string) =>
    openCollections.data?.items.find((c) => c.budget?.id === budgetId) ?? null;

  /** Forget the event link once used, so a refresh does not reopen it. */
  function clearLink() {
    if (search.plan)
      void navigate({
        to: '.',
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          plan: undefined,
          planTitle: undefined,
        }),
        replace: true,
      });
  }

  return (
    <div className="money-section">
      <div className="section-bar">
        <h2 className="section-title">{period === 'open' ? 'Budgets' : 'Past budgets'}</h2>
        <div className="section-bar__actions">
          {canManage && period === 'open' && (
            <Button inline icon={<IconPlus />} onClick={() => setCreating(true)}>
              New budget
            </Button>
          )}
        </div>
      </div>

      {budgets.data === undefined ? (
        budgets.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(budgets.error)} />
        )
      ) : budgets.data.items.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<IconFlag />}
            title={filter === 'active' ? 'No open budgets' : 'No past budgets yet'}
          />
        </section>
      ) : (
        <ul className="budget-cards" role="list">
          {budgets.data.items.map((budget) => (
            <li key={budget.id}>
              <BudgetCard
                budget={budget}
                asking={askingFor(budget.id)}
                onOpen={() =>
                  void navigate({
                    to: '/finance/budget/$budgetId',
                    params: { budgetId: budget.id },
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}

      <BudgetFormDialog
        open={creating || planEvent !== null}
        budget={null}
        event={planEvent ?? undefined}
        onClose={() => {
          setCreating(false);
          setPlanEvent(null);
          clearLink();
        }}
        onSaved={(message) => {
          setCreating(false);
          setPlanEvent(null);
          clearLink();
          onDone(message);
        }}
      />
    </div>
  );
}

/**
 * One budget on its own page (it is too large for a side panel): its lines,
 * money in and out, and what members pay towards it, with Contribute.
 */
export function BudgetPage({ budgetId }: { budgetId: string }) {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="page budget-page">
      <Link to="/finance/planning" className="meeting-back">
        <IconArrowLeft aria-hidden="true" />
        Budgets
      </Link>
      {notice && <SuccessNotice text={notice} />}
      <section className="card budget-page__body">
        <BudgetDetails budgetId={budgetId} onDone={setNotice} />
      </section>
    </div>
  );
}

function BudgetCard({
  budget,
  asking,
  onOpen,
}: {
  budget: Budget;
  /** What members are asked to pay towards it, when they are. */
  asking: Campaign | null;
  onOpen: () => void;
}) {
  const due = budget.status === 'active' ? dueText(asking?.due_date) : null;
  const hasGoal = budget.planned_minor > 0;
  const left = budget.raised_minor - budget.spent_minor;
  // At a glance: how far we are (with a goal), what came in, what was used, the time left.
  return (
    <button type="button" className="card budget-card budget-card--goal" onClick={onOpen}>
      {hasGoal && <ProgressRing value={budget.raised_minor} of={budget.planned_minor} />}
      <div className="budget-card__goal">
        <div className="budget-card__head">
          <h3 className="budget-card__title">{budget.title}</h3>
          {budget.status !== 'active' && <Badge tone="neutral">Closed</Badge>}
        </div>
        <p className="budget-card__amounts">
          <strong>{formatAmount(budget.raised_minor)}</strong>{' '}
          {hasGoal
            ? `of ${formatAmount(budget.planned_minor)} ${budget.currency}`
            : `${budget.currency} collected`}
        </p>
        {budget.spent_minor > 0 && (
          <p className="budget-card__amounts">
            {formatAmount(budget.spent_minor)} used · {formatAmount(left)} left
          </p>
        )}
        {due && (
          <p className={`budget-card__due${due.endsWith('late') ? ' is-late' : ''}`}>{due}</p>
        )}
      </div>
    </button>
  );
}

/**
 * One budget: the same panel in Finance and on its event's page (`embedded`,
 * where the event already names it). For an event's budget, its organisers
 * run it too; Finance confirms the payments and approves the spending.
 */
export function BudgetDetails({
  budgetId,
  onDone,
  embedded = false,
}: {
  budgetId: string;
  onDone: (m: string) => void;
  embedded?: boolean;
}) {
  const { communityId, can } = useWorkspace();
  const detail = useBudgetDetail(communityId, budgetId);
  const close = useCloseBudget();
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');
  const status = detail.data?.status === 'closed' ? 'closed' : 'open';
  // What members are asked to pay towards this budget, set in Edit.
  const asks = useCampaigns(communityId, status);
  const asking = asks.data?.items.find((c) => c.budget?.id === budgetId) ?? null;

  if (detail.data === undefined) {
    return detail.isPending ? (
      <LoadingState />
    ) : (
      <ErrorState message={errorMessage(detail.error)} />
    );
  }
  const b = detail.data;
  const forEvent = b.event !== null && organisesEventMoney(can);
  const canManage = (can('finance.budget.manage') || forEvent) && b.status === 'active';
  const hasGoal = b.planned_minor > 0;
  const stillNeeded = Math.max(b.planned_minor - b.raised_minor, 0);
  const left = b.raised_minor - b.spent_minor;
  const due = b.status === 'active' ? dueText(asking?.due_date) : null;

  return (
    <section className="details" aria-labelledby={embedded ? undefined : 'budget-title'}>
      {!embedded && (
        <header className="details__head">
          <div>
            <p className="section-head__eyebrow">Budget</p>
            <h2 id="budget-title" className="section-head__title">
              {b.title}
            </h2>
            <p className="section-head__subtitle">
              Created by {b.created_by.full_name} · {formatDate(b.created_at)}
            </p>
          </div>
          <Badge tone={b.status === 'active' ? 'success' : 'neutral'}>
            {b.status === 'active' ? 'Open' : 'Closed'}
          </Badge>
        </header>
      )}

      {b.description && <p className="details__note">{b.description}</p>}

      {/* How far we are: the ring (with a goal), three numbers, one short line. */}
      <div className="budget-goal">
        {hasGoal && (
          <ProgressRing value={b.raised_minor} of={b.planned_minor} size={160} stroke={16} />
        )}
        <div className="budget-goal__body">
          <dl className="budget-goal__stats">
            <div>
              <dt>Collected</dt>
              <dd>{formatAmount(b.raised_minor)}</dd>
            </div>
            <div>
              <dt>Used</dt>
              <dd>{formatAmount(b.spent_minor)}</dd>
            </div>
            <div>
              <dt>Left</dt>
              <dd className={left < 0 ? 'is-negative' : undefined}>{formatAmount(left)}</dd>
            </div>
          </dl>
          <p className="budget-goal__line">
            {hasGoal
              ? `Goal ${formatAmount(b.planned_minor)} ${b.currency} · ${
                  stillNeeded > 0 ? `${formatAmount(stillNeeded)} still needed` : 'goal reached'
                }`
              : 'No fixed amount: members give freely'}
            {asking?.due_date && ` · pay by ${formatDate(asking.due_date)}`}
            {due && (
              <strong className={due.endsWith('late') ? 'is-late' : undefined}> ({due})</strong>
            )}
            {asking && ` · ${asking.paid_count} of ${asking.member_count} members paid`}
          </p>
        </div>
      </div>

      <CampaignsSection onDone={onDone} budgetId={b.id} status={status} title="Contribute" />

      <BudgetUses
        budgetId={b.id}
        currency={b.currency}
        open={b.status === 'active'}
        canAdd={can('finance.expense.record') || forEvent}
        onDone={onDone}
      />

      {b.close_note && (
        <p className="details__note">
          <strong>Closed:</strong> {b.close_note}
        </p>
      )}

      {canManage && (
        <div className="review-actions">
          <Button variant="secondary" inline icon={<IconPencil />} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button variant="secondary" inline onClick={() => setClosing(true)}>
            Close budget
          </Button>
        </div>
      )}

      <BudgetFormDialog
        open={editing}
        budget={b}
        asking={asking}
        onClose={() => setEditing(false)}
        onSaved={(message) => {
          setEditing(false);
          onDone(message);
        }}
      />

      <Dialog
        open={closing}
        onClose={() => setClosing(false)}
        title="Close budget"
        subtitle="Members can no longer contribute to it. What was collected stays."
        icon={
          <IconTile tone="warning" round>
            <IconFlag />
          </IconTile>
        }
      >
        <div className="dialog__form">
          <Textarea
            label="Note"
            optional
            rows={2}
            maxLength={255}
            placeholder="e.g. Gift handed over on Saturday."
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          {close.error && <p className="form-error">{errorMessage(close.error)}</p>}
          <div className="dialog__footer dialog__footer--flush">
            <Button variant="tint" onClick={() => setClosing(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={close.isPending || !communityId}
              onClick={() =>
                communityId &&
                close.mutate(
                  { communityId, budgetId: b.id, note: note.trim() },
                  { onSuccess: () => onDone(`${b.title} closed.`) },
                )
              }
            >
              {close.isPending ? 'Closing…' : 'Close budget'}
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

/**
 * What the budget's money was used for: Transport 50,000, Food 30,000...
 * Each use is an expense from this budget; the Treasurer adds one with "Add
 * what was used". Approved ones count in Used; others wait for approval.
 */
function BudgetUses({
  budgetId,
  currency,
  open,
  canAdd,
  onDone,
}: {
  budgetId: string;
  currency: string;
  open: boolean;
  canAdd: boolean;
  onDone: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const expenses = useExpenses(communityId, { budget_id: budgetId, page_size: 100 });
  const rows = (expenses.data?.items ?? []).filter(
    (e) => e.status === 'approved' || e.status === 'pending',
  );

  return (
    <div className="money-section">
      <div className="section-bar">
        <h2 className="section-title">Used for</h2>
        {open && canAdd && (
          <div className="section-bar__actions">
            <Button inline variant="secondary" icon={<IconPlus />} onClick={() => setAdding(true)}>
              Add what was used
            </Button>
          </div>
        )}
      </div>
      {expenses.isPending ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <p className="table__muted">Nothing used from this budget yet.</p>
      ) : (
        <ul className="budget-uses" role="list">
          {rows.map((e) => (
            <li key={e.id}>
              <span>
                {e.description}
                {e.status === 'pending' && (
                  <Badge tone="warning" className="budget-uses__badge">
                    Awaiting approval
                  </Badge>
                )}
              </span>
              <strong>
                {formatAmount(e.amount_minor)} {currency}
              </strong>
            </li>
          ))}
        </ul>
      )}
      <AddUseDialog
        open={adding}
        budgetId={budgetId}
        onClose={() => setAdding(false)}
        onSaved={() => {
          setAdding(false);
          onDone('Saved. It counts in Used once someone else approves it in Expenses & Income.');
        }}
      />
    </div>
  );
}

/** "Add what was used": what for, how much, when. Saved as an expense from the budget. */
function AddUseDialog({
  open,
  budgetId,
  onClose,
  onSaved,
}: {
  open: boolean;
  budgetId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { communityId } = useWorkspace();
  const record = useRecordExpense();
  const [what, setWhat] = useState('');
  const [amount, setAmount] = useState('');
  const [when, setWhen] = useState(today());
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (what.trim().length < 2) problems.what = 'Say what it was for, e.g. Transport.';
    if (amount.trim() === '' || toMinor(amount) <= 0) problems.amount = 'Enter the amount.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;
    record.mutate(
      {
        communityId,
        description: what.trim(),
        amount_minor: toMinor(amount),
        spent_at: when,
        budget_id: budgetId,
      },
      {
        onSuccess: () => {
          setWhat('');
          setAmount('');
          onSaved();
        },
        onError: (error) => {
          const f = error instanceof ApiError ? error.fieldErrors : {};
          setErrors({
            what: f.description,
            amount: f.amount_minor,
            when: f.spent_at,
            form: f.description || f.amount_minor || f.spent_at ? undefined : errorMessage(error),
          });
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add what was used"
      subtitle="Counts once someone else approves it."
      icon={
        <IconTile tone="brand" round>
          <IconFlag />
        </IconTile>
      }
    >
      <form className="dialog__form" onSubmit={handleSubmit} noValidate>
        <Input
          label="What for"
          placeholder="e.g. Transport"
          maxLength={255}
          value={what}
          onChange={(event) => setWhat(event.target.value)}
          error={errors.what}
          required
        />
        <div className="form-row">
          <Input
            label="Amount (RWF)"
            type="number"
            min={1}
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={errors.amount}
            required
          />
          <Input
            label="Date"
            type="date"
            max={today()}
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            error={errors.when}
            required
          />
        </div>
        {errors.form && <p className="form-error">{errors.form}</p>}
        <div className="dialog__footer dialog__footer--flush">
          <Button variant="tint" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * For whoever reviews payments: every member, what they were asked and what
 * they paid, so the Treasurer sees who still owes and who gave more.
 */
function MembersPaid({ campaign }: { campaign: Campaign }) {
  const { communityId } = useWorkspace();
  const members = useCampaignMembers(communityId, campaign.id);
  const rows = members.data?.items ?? [];
  const owing = rows.filter((r) => r.asked_minor !== null && r.paid_minor < r.asked_minor).length;
  const extra = rows.filter((r) => r.asked_minor !== null && r.paid_minor > r.asked_minor).length;
  const done = rows.filter(
    (r) => r.asked_minor !== null && r.asked_minor > 0 && r.paid_minor === r.asked_minor,
  ).length;

  return (
    <div className="members-paid">
      <h3 className="details__subhead">Members</h3>
      {members.isPending ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <p className="table__muted">No members asked yet.</p>
      ) : (
        <>
          <p className="table__muted">
            {done} paid in full · {extra} paid more · {owing} still to pay
          </p>
          <div className="table-scroll">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col" className="num">
                    Asked
                  </th>
                  <th scope="col" className="num">
                    Paid
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const status = memberStatus(r.asked_minor, r.paid_minor);
                  return (
                    <tr key={r.membership_id}>
                      <td>
                        <div className="table__stack">
                          <span>{r.full_name}</span>
                          {r.category && <span className="table__muted">{r.category}</span>}
                        </div>
                      </td>
                      <td className="num">
                        {r.asked_minor === null ? 'Any' : formatAmount(r.asked_minor)}
                      </td>
                      <td className="num">
                        {formatAmount(r.paid_minor)}
                        {r.pending_minor > 0 && (
                          <span className="table__muted">
                            {' '}
                            (+{formatAmount(r.pending_minor)} in review)
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export function BudgetFormDialog({
  open,
  budget,
  asking = null,
  event,
  onClose,
  onSaved,
}: {
  open: boolean;
  budget: BudgetDetail | null;
  /** What members are asked to pay towards the budget, when they are. */
  asking?: Campaign | null;
  /** Turning the budget on from an event's page: it belongs to that event. */
  event?: { id: string; title: string; date?: string };
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const ofEvent = event !== undefined || (budget !== null && budget.event !== null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={budget ? 'Edit budget' : event ? `Budget for ${event.title}` : 'New budget'}
      subtitle={
        ofEvent
          ? 'The event gives the name. Say how much and who pays.'
          : 'What you are collecting for, how much, and by when.'
      }
      icon={
        <IconTile tone="brand" round>
          <IconFlag />
        </IconTile>
      }
    >
      {open && (
        <BudgetForm
          budget={budget}
          asking={asking}
          forEvent={event}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

type Ask = CampaignCharge | 'none';

function BudgetForm({
  budget,
  asking,
  forEvent,
  onClose,
  onSaved,
}: {
  budget: BudgetDetail | null;
  asking: Campaign | null;
  forEvent?: { id: string; title: string; date?: string };
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId, can } = useWorkspace();
  const eventBudget = forEvent !== undefined || (budget !== null && budget.event !== null);
  const canAsk = can('finance.campaign.manage') || (eventBudget && organisesEventMoney(can));
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const createAsk = useCreateCampaign();
  const updateAsk = useUpdateCampaign();
  const stopAsk = useCloseCampaign();
  // What members pay towards the budget: part of the budget, not a separate thing.
  // A new budget asks members by category unless the Treasurer picks otherwise.
  const [ask, setAsk] = useState<Ask>(asking?.charge ?? (budget ? 'none' : 'per_category'));
  const [askAmount, setAskAmount] = useState(
    asking && asking.amount_minor !== null ? toRwf(asking.amount_minor) : '',
  );
  const [askRequired, setAskRequired] = useState(asking?.required ?? false);
  // per_category: what each member category pays, as typed (RWF).
  const categories = useMemberCategories(communityId);
  const payingCategories = (categories.data ?? []).filter(
    (c) => c.is_active && !c.is_stipend_recipient,
  );
  const [categoryAmounts, setCategoryAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (asking?.category_amounts ?? []).map((c) => [c.category_id, toRwf(c.amount_minor)]),
    ),
  );
  // An event's budget is paid by the event's day unless the organiser says otherwise.
  const eventDay = forEvent?.date && forEvent.date >= today() ? forEvent.date : '';
  const [askDue, setAskDue] = useState(asking?.due_date ?? eventDay);
  const [saving, setSaving] = useState(false);
  // An event's budget takes the event's name: nothing to type.
  const [title, setTitle] = useState(budget?.title ?? forEvent?.title ?? '');
  const [description, setDescription] = useState(budget?.description ?? '');
  // The goal: one amount. An older budget planned in several lines keeps them.
  const oldLines = budget !== null && budget.lines.length > 1;
  const [goal, setGoal] = useState(
    budget && budget.planned_minor > 0 ? toRwf(budget.planned_minor) : '',
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = saving;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (title.trim().length < 3)
      problems.title = 'Give the budget a title of at least 3 characters.';
    if (!oldLines && goal.trim() !== '' && !(toMinor(goal) >= 0))
      problems.goal = 'Enter an amount, or leave it empty.';
    if (
      ask !== 'none' &&
      ask !== 'any' &&
      ask !== 'per_category' &&
      (askAmount.trim() === '' || toMinor(askAmount) <= 0)
    )
      problems.askAmount = 'Enter what each member pays.';
    if (
      ask === 'per_category' &&
      !payingCategories.some((c) => toMinor(categoryAmounts[c.id] ?? '') > 0)
    )
      problems.categoryAmounts = 'Enter what at least one category pays.';
    if (ask !== 'none' && askDue && askDue < today())
      problems.askDue = 'The due date is today or later.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;

    const body = {
      communityId,
      title: title.trim(),
      description: description.trim() || null,
      lines:
        budget && oldLines
          ? budget.lines.map((l) => ({ id: l.id, title: l.title, planned_minor: l.planned_minor }))
          : [
              {
                ...(budget?.lines[0] ? { id: budget.lines[0].id } : {}),
                title: budget?.lines[0]?.title ?? 'Goal',
                // No goal: members give freely; 0 means "no fixed amount".
                planned_minor: goal.trim() === '' ? 0 : toMinor(goal),
              },
            ],
    };
    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      const known = f.title || f.lines || f.amount_minor || f.due_date || f.category_amounts;
      setErrors({
        title: f.title,
        goal: f.lines,
        askAmount: f.amount_minor,
        categoryAmounts: f.category_amounts,
        askDue: f.due_date,
        // An event problem (cancelled, already has a budget) is shown as a whole.
        form: known ? undefined : (f.event_id ?? errorMessage(error)),
      });
    };

    const cid = communityId;
    async function save() {
      setSaving(true);
      try {
        const saved = budget
          ? await update.mutateAsync({ ...body, budgetId: budget.id })
          : await create.mutateAsync(forEvent ? { ...body, event_id: forEvent.id } : body);
        // Then what members pay towards it: start, change or stop it.
        if (canAsk && ask !== 'none') {
          const askBody = {
            communityId: cid,
            title: saved.title,
            charge: ask,
            amount_minor: ask === 'any' || ask === 'per_category' ? null : toMinor(askAmount),
            ...(ask === 'per_category'
              ? {
                  category_amounts: payingCategories.map((c) => ({
                    category_id: c.id,
                    amount_minor: toMinor(categoryAmounts[c.id] ?? '') || 0,
                  })),
                }
              : {}),
            required: askRequired,
            due_date: askDue || null,
          };
          if (asking) await updateAsk.mutateAsync({ ...askBody, campaignId: asking.id });
          else await createAsk.mutateAsync({ ...askBody, budget_id: saved.id });
        } else if (canAsk && asking) {
          await stopAsk.mutateAsync({ communityId: cid, campaignId: asking.id });
        }
        onSaved(
          budget
            ? `${body.title} saved.`
            : ask !== 'none'
              ? `${body.title} created. Members can contribute to it now.`
              : `${body.title} created.`,
        );
      } catch (error) {
        onError(error);
      } finally {
        setSaving(false);
      }
    }
    void save();
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      {/* An event's budget: the event already says what it is for. */}
      {!eventBudget && (
        <>
          <Input
            label="Title"
            placeholder="e.g. End-of-year celebration"
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={errors.title}
            required
          />
          <Textarea
            label="Description"
            optional
            rows={2}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </>
      )}
      {eventBudget && errors.title && <p className="form-error">{errors.title}</p>}
      {oldLines && budget ? (
        <p className="details__note">
          Goal: <strong>{formatAmount(budget.planned_minor)} RWF</strong> (the total of this
          budget&apos;s {budget.lines.length} lines).
        </p>
      ) : (
        <Input
          label="Goal (RWF)"
          optional
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 500000"
          hint="Leave empty when there is no fixed amount and members give freely."
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          error={errors.goal}
        />
      )}
      {canAsk && (
        <fieldset className="budget-ask">
          <legend className="field__label">Who pays</legend>
          <div className="form-row">
            <Select
              label="Ask members to pay towards it"
              value={ask}
              onChange={(event) => setAsk(event.target.value as Ask)}
              options={[
                { value: 'none', label: 'No' },
                { value: 'fixed', label: 'Yes, the same amount per member' },
                { value: 'per_category', label: 'Yes, an amount per category' },
                ...(asking?.charge === 'per_share'
                  ? [{ value: 'per_share', label: 'Yes, an amount per share' }]
                  : []),
                { value: 'any', label: 'Yes, any amount (each member decides)' },
              ]}
            />
            {ask !== 'none' && ask !== 'any' && ask !== 'per_category' && (
              <Input
                label={ask === 'per_share' ? 'Amount per share (RWF)' : 'Amount per member (RWF)'}
                type="number"
                min={1}
                step="any"
                value={askAmount}
                onChange={(event) => setAskAmount(event.target.value)}
                error={errors.askAmount}
                required
              />
            )}
          </div>
          {ask === 'per_category' && (
            <div className="budget-ask__categories">
              <p className="field__label">What each category pays (RWF)</p>
              {categories.isPending ? (
                <p className="table__muted">Loading the categories…</p>
              ) : payingCategories.length === 0 ? (
                <p className="table__muted">This community has no paying categories yet.</p>
              ) : (
                payingCategories.map((c) => (
                  <div key={c.id} className="budget-ask__category">
                    <span>{c.name}</span>
                    <Input
                      label={`${c.name} pays (RWF)`}
                      labelHidden
                      type="number"
                      min={0}
                      step="any"
                      placeholder="0"
                      value={categoryAmounts[c.id] ?? ''}
                      onChange={(event) =>
                        setCategoryAmounts((all) => ({ ...all, [c.id]: event.target.value }))
                      }
                    />
                  </div>
                ))
              )}
              <p className="table__muted">Leave 0 for a category that does not pay.</p>
              {errors.categoryAmounts && <p className="field__error">{errors.categoryAmounts}</p>}
            </div>
          )}
          {ask !== 'none' && (
            <div className="form-row">
              <Input
                label="Pay by"
                optional
                type="date"
                min={today()}
                value={askDue}
                onChange={(event) => setAskDue(event.target.value)}
                error={errors.askDue}
              />
              <Checkbox
                label="Every member must pay (untick for voluntary)"
                checked={askRequired}
                onChange={(event) => setAskRequired(event.target.checked)}
              />
            </div>
          )}
          {asking && ask === 'none' && (
            <p className="table__muted">
              Saving stops contributions to this budget. What was paid stays.
            </p>
          )}
        </fieldset>
      )}
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : budget ? 'Save budget' : 'Create budget'}
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Dedicated contributions
// ---------------------------------------------------------------------------

type CampaignFilter = 'open' | 'closed';

/** The collections a list shows: one budget's, the ones with no budget, or all. */
function shownCampaigns(items: Campaign[], budgetId?: string, standalone = false): Campaign[] {
  if (budgetId) return items.filter((c) => c.budget?.id === budgetId);
  if (standalone) return items.filter((c) => c.budget === null);
  return items;
}

function CampaignsSection({
  onDone,
  budgetId,
  standalone = false,
  status,
  title = 'Dedicated contributions',
}: {
  onDone: (message: string) => void;
  /** Open ones, or closed ones kept as a record. */
  status: CampaignFilter;
  /** Inside a budget's panel: that budget's open collections only. */
  budgetId?: string;
  /** On the page: only the collections not tied to a budget. */
  standalone?: boolean;
  title?: string;
}) {
  const { communityId, can } = useWorkspace();
  const canManage = can('finance.campaign.manage');
  const filter = status;
  const [contributingTo, setContributingTo] = useState<Campaign | null>(null);
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null);
  const [closingId, setClosingId] = useState<Campaign | null>(null);
  const [paymentsOf, setPaymentsOf] = useState<Campaign | null>(null);
  const close = useCloseCampaign();
  const campaigns = useCampaigns(communityId, filter);

  return (
    <div className="money-section">
      {budgetId && (
        <div className="section-bar">
          <h2 className="section-title">{title}</h2>
        </div>
      )}

      {campaigns.data === undefined ? (
        campaigns.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(campaigns.error)} />
        )
      ) : shownCampaigns(campaigns.data.items, budgetId, standalone).length === 0 ? (
        budgetId ? (
          <p className="table__muted">
            {filter === 'open'
              ? `Members are not asked to contribute to this budget yet.${
                  can('finance.campaign.manage') ? ' Use Edit to ask them.' : ''
                }`
              : 'Members were not asked to contribute to this budget.'}
          </p>
        ) : null
      ) : (
        <ul className={budgetId ? 'budget-contribute-list' : 'budget-cards'} role="list">
          {shownCampaigns(campaigns.data.items, budgetId, standalone).map((c) => (
            <li
              key={c.id}
              className={budgetId ? 'budget-contribute' : 'card budget-card budget-card--static'}
            >
              {!budgetId && (
                <div className="budget-card__head">
                  <h3 className="budget-card__title">{c.title}</h3>
                  <Badge tone={c.status === 'open' ? 'success' : 'neutral'}>
                    {c.status === 'open' ? 'Open for contributions' : 'Closed'}
                  </Badge>
                </div>
              )}
              <p className={budgetId ? 'table__muted' : 'budget-card__event'}>
                {budgetId && (filter === 'open' ? 'Members are asked: ' : 'Members were asked: ')}
                {chargeText(c.charge, c.amount_minor, c.currency)}
                {budgetId && ` · ${c.required ? 'Required' : 'Voluntary'}`}
                {!budgetId && c.due_date && ` · due ${formatDate(c.due_date)}`}
              </p>
              {budgetId && c.charge === 'per_category' && c.category_amounts.length > 0 && (
                <ul className="category-amounts" role="list" aria-label="What each category pays">
                  {c.category_amounts.map((row) => (
                    <li key={row.category_id}>
                      <span>{row.name}</span>
                      <strong>
                        {row.amount_minor > 0
                          ? `${formatAmount(row.amount_minor)} ${c.currency}`
                          : 'Not asked'}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
              {budgetId ? null : c.expected_minor !== null ? (
                <Meter
                  label="Collected"
                  value={c.collected_minor}
                  of={c.expected_minor}
                  currency={c.currency}
                  tone="in"
                />
              ) : (
                <p className="budget-card__planned">
                  {formatAmount(c.collected_minor)}{' '}
                  <span className="money__unit">{c.currency} collected</span>
                </p>
              )}
              {!budgetId && (
                // Clean card: who paid and your part, in two figures.
                <dl className="budget-card__figures">
                  <div>
                    <dt>Paid</dt>
                    <dd>
                      {c.paid_count} of {c.member_count}
                    </dd>
                  </div>
                  <div>
                    <dt>You paid</dt>
                    <dd>{formatAmount(c.my_share.paid_minor)}</dd>
                  </div>
                </dl>
              )}
              {budgetId && (
                <div
                  className={`campaign-mine campaign-mine--${yourPart(c.my_share, c.currency).tone}`}
                >
                  {yourPart(c.my_share, c.currency).text}
                </div>
              )}
              <div className="review-actions">
                {!(budgetId && reviewsContributions(can)) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    inline
                    icon={<IconFile />}
                    onClick={() => setPaymentsOf(c)}
                  >
                    {budgetId ? 'Who paid' : 'Payments'}
                  </Button>
                )}
                {c.status === 'open' && can('finance.contribution.record') && (
                  <Button size="sm" inline onClick={() => setContributingTo(c)}>
                    {yourPart(c.my_share, c.currency).leftMinor > 0
                      ? `Pay ${formatAmount(yourPart(c.my_share, c.currency).leftMinor)}`
                      : c.my_share.paid_minor > 0
                        ? 'Add a payment'
                        : 'Contribute'}
                  </Button>
                )}
                {/* Inside a budget, the budget's own Edit changes what members pay. */}
                {canManage && c.status === 'open' && !budgetId && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      inline
                      icon={<IconPencil />}
                      onClick={() => setEditing(c)}
                    >
                      {budgetId ? 'Edit request' : 'Edit'}
                    </Button>
                    <Button variant="secondary" size="sm" inline onClick={() => setClosingId(c)}>
                      {budgetId ? 'Stop collecting' : 'Close'}
                    </Button>
                  </>
                )}
              </div>
              {budgetId && reviewsContributions(can) && <MembersPaid campaign={c} />}
            </li>
          ))}
        </ul>
      )}

      <Drawer
        open={paymentsOf !== null}
        onClose={() => setPaymentsOf(null)}
        label="Payments into the dedicated contribution"
      >
        {paymentsOf && <CampaignPayments campaign={paymentsOf} />}
      </Drawer>

      {/* Contribute right here, with this collection already chosen. */}
      <RecordContributionDialog
        open={contributingTo !== null}
        onClose={() => setContributingTo(null)}
        shares={undefined}
        initial={
          contributingTo
            ? {
                type: 'dedicated',
                campaignId: contributingTo.id,
                amountMinor:
                  yourPart(contributingTo.my_share, contributingTo.currency).leftMinor || undefined,
              }
            : undefined
        }
        onRecorded={(contribution) => {
          setContributingTo(null);
          onDone(
            contribution.status === 'confirmed'
              ? `${formatAmount(contribution.amount_minor)} ${contribution.currency} recorded for ${contribution.campaign?.title ?? 'the collection'}.`
              : `${formatAmount(contribution.amount_minor)} ${contribution.currency} sent for review.`,
          );
        }}
      />

      <CampaignFormDialog
        open={editing !== null}
        campaign={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          onDone(message);
        }}
      />

      <Dialog
        open={closingId !== null}
        onClose={() => setClosingId(null)}
        title="Close collection"
        subtitle="Members can no longer pay into it. What was collected stays."
        icon={
          <IconTile tone="warning" round>
            <IconHandHeart />
          </IconTile>
        }
      >
        <div className="dialog__form">
          <p>{closingId?.title}</p>
          {close.error && <p className="form-error">{errorMessage(close.error)}</p>}
          <div className="dialog__footer dialog__footer--flush">
            <Button variant="tint" onClick={() => setClosingId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={close.isPending}
              onClick={() =>
                communityId &&
                closingId &&
                close.mutate(
                  { communityId, campaignId: closingId.id },
                  {
                    onSuccess: () => {
                      onDone(`${closingId.title} closed.`);
                      setClosingId(null);
                    },
                  },
                )
              }
            >
              {close.isPending ? 'Closing…' : 'Close collection'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

export function CampaignFormDialog({
  open,
  campaign,
  budgetId,
  onClose,
  onSaved,
}: {
  open: boolean;
  campaign: Campaign | null;
  /** Opening one from a budget's details: that budget is pre-chosen. */
  budgetId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={campaign ? 'Edit collection' : 'New dedicated contribution'}
      subtitle="Members pay it from My Contributions."
      icon={
        <IconTile tone="brand" round>
          <IconHandHeart />
        </IconTile>
      }
    >
      {open && (
        <CampaignForm campaign={campaign} budgetId={budgetId} onClose={onClose} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function CampaignForm({
  campaign,
  budgetId: fixedBudget,
  onClose,
  onSaved,
}: {
  campaign: Campaign | null;
  budgetId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const budgets = useBudgets(communityId, 'active');
  const [title, setTitle] = useState(campaign?.title ?? '');
  const [description, setDescription] = useState('');
  const [budgetId, setBudgetId] = useState(fixedBudget ?? campaign?.budget?.id ?? '');
  const [charge, setCharge] = useState<CampaignCharge>(campaign?.charge ?? 'per_share');
  const [amount, setAmount] = useState(
    campaign && campaign.amount_minor !== null ? toRwf(campaign.amount_minor) : '',
  );
  const anyAmount = charge === 'any';
  const [required, setRequired] = useState(campaign?.required ?? true);
  const [dueDate, setDueDate] = useState(campaign?.due_date ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = create.isPending || update.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (title.trim().length < 3) problems.title = 'Give it a title of at least 3 characters.';
    if (!anyAmount && (amount.trim() === '' || toMinor(amount) <= 0))
      problems.amount = 'Enter the amount each member pays.';
    if (dueDate && dueDate < today()) problems.due_date = 'The due date is today or later.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;

    const body = {
      communityId,
      title: title.trim(),
      description: description.trim() || null,
      charge,
      amount_minor: anyAmount ? null : toMinor(amount),
      required,
      due_date: dueDate || null,
    };
    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      const mapped = {
        title: f.title,
        amount: f.amount_minor,
        due_date: f.due_date,
        budget: f.budget_id,
      };
      setErrors({
        ...mapped,
        form: Object.values(mapped).some(Boolean) ? undefined : errorMessage(error),
      });
    };
    if (campaign) {
      update.mutate(
        { ...body, campaignId: campaign.id },
        { onSuccess: () => onSaved(`${body.title} saved.`), onError },
      );
    } else {
      create.mutate(
        { ...body, budget_id: budgetId || null },
        { onSuccess: () => onSaved(`${body.title} is open for payments.`), onError },
      );
    }
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Title"
        placeholder="e.g. Celebration contribution"
        maxLength={160}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={errors.title}
        required
      />
      {!campaign && (
        <Textarea
          label="Description"
          optional
          rows={2}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      )}
      {!campaign && !fixedBudget && (
        <Select
          label="For budget"
          value={budgetId}
          onChange={(event) => setBudgetId(event.target.value)}
          options={[
            { value: '', label: 'No budget (general collection)' },
            ...(budgets.data?.items ?? []).map((b) => ({ value: b.id, label: b.title })),
          ]}
          error={errors.budget}
        />
      )}
      <div className="form-row">
        <Select
          label="How much each member pays"
          value={charge}
          onChange={(event) => setCharge(event.target.value as CampaignCharge)}
          options={[
            { value: 'per_share', label: 'An amount per share' },
            { value: 'fixed', label: 'The same amount per member' },
            { value: 'any', label: 'Any amount (each member decides)' },
          ]}
        />
        {!anyAmount && (
          <Input
            label={charge === 'per_share' ? 'Amount per share (RWF)' : 'Amount per member (RWF)'}
            type="number"
            min={1}
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            error={errors.amount}
            required
          />
        )}
      </div>
      <Input
        label="Due date"
        optional
        type="date"
        min={today()}
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        error={errors.due_date}
      />
      <Checkbox
        label="Required (untick for voluntary)"
        checked={required}
        onChange={(event) => setRequired(event.target.checked)}
      />
      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : campaign ? 'Save' : 'Open collection'}
        </Button>
      </div>
    </form>
  );
}
