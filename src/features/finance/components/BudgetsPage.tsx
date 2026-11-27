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
  IconCalendar,
  IconFlag,
  IconArrowLeft,
  IconFile,
  IconHandHeart,
  IconPencil,
  IconPlus,
  IconSend,
  IconTile,
  IconTrash,
  Input,
  LoadingState,
  SegmentedControl,
  Select,
  Textarea,
} from '@/components/ui';
import { reviewsContributions, reviewsExpenses, useWorkspace } from '@/features/auth';
import { useMemberCategories } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  useBudgetDetail,
  useBudgets,
  useCampaigns,
  useCloseBudget,
  useCloseCampaign,
  useCreateBudget,
  useCreateCampaign,
  useUpdateBudget,
  useUpdateCampaign,
} from '../api/budgets';
import type { Budget, BudgetDetail, Campaign, CampaignCharge } from '../api/budgets';
import { MINOR_PER_MAJOR, chargeText, formatAmount } from '../format';
import { CampaignPayments } from './CampaignPayments';
import { RecordContributionDialog } from './RecordContributionDialog';
import { RecordExpenseDialog } from './RecordExpenseDialog';
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
  const openCollections = useCampaigns(communityId, 'open');
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
  /** The budget's open collection, when members are asked to contribute. */
  asking: Campaign | null;
  onOpen: () => void;
}) {
  const collecting = asking !== null && budget.status === 'active';
  // Clean card: name, what is planned, money in and out. The rest is on the budget's page.
  return (
    <button type="button" className="card budget-card" onClick={onOpen}>
      <div className="budget-card__head">
        <h3 className="budget-card__title">{budget.title}</h3>
        {budget.status !== 'active' ? (
          <Badge tone="neutral">Closed</Badge>
        ) : (
          collecting && <Badge tone="success">Open for contributions</Badge>
        )}
      </div>
      {budget.event && (
        <p className="budget-card__event">
          <IconCalendar width={14} height={14} aria-hidden="true" /> {budget.event.title}
        </p>
      )}
      <p className="budget-card__planned">
        {formatAmount(budget.planned_minor)}{' '}
        <span className="money__unit">{budget.currency} planned</span>
      </p>
      <dl className="budget-card__figures">
        <div>
          <dt>Raised</dt>
          <dd>{formatAmount(budget.raised_minor)}</dd>
        </div>
        <div>
          <dt>Spent</dt>
          <dd>{formatAmount(budget.spent_minor)}</dd>
        </div>
      </dl>
    </button>
  );
}

function BudgetDetails({ budgetId, onDone }: { budgetId: string; onDone: (m: string) => void }) {
  const { communityId, can } = useWorkspace();
  const detail = useBudgetDetail(communityId, budgetId);
  const close = useCloseBudget();
  const [editing, setEditing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');
  // What members are asked to pay towards this budget, set in Edit.
  const openAsks = useCampaigns(communityId, 'open');
  const asking = openAsks.data?.items.find((c) => c.budget?.id === budgetId) ?? null;
  const [usingPocket, setUsingPocket] = useState(false);

  if (detail.data === undefined) {
    return detail.isPending ? (
      <LoadingState />
    ) : (
      <ErrorState message={errorMessage(detail.error)} />
    );
  }
  const b = detail.data;
  const canManage = can('finance.budget.manage') && b.status === 'active';

  return (
    <section className="details" aria-labelledby="budget-title">
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

      {b.description && <p className="details__note">{b.description}</p>}

      <Meter
        label="Raised"
        value={b.raised_minor}
        of={b.planned_minor}
        currency={b.currency}
        tone="in"
      />
      <Meter
        label="Spent"
        value={b.spent_minor}
        of={b.planned_minor}
        currency={b.currency}
        tone="out"
        pending={reviewsExpenses(can) ? b.pending_spent_minor : 0}
      />

      <h3 className="details__subhead">Lines</h3>
      <div className="table-scroll">
        <table className="table table--compact budget-lines">
          <thead>
            <tr>
              <th scope="col">Line</th>
              <th scope="col" className="statement-table__num">
                Planned
              </th>
              <th scope="col" className="statement-table__num">
                Spent
              </th>
              <th scope="col" className="statement-table__num">
                Left
              </th>
            </tr>
          </thead>
          <tbody>
            {b.lines.map((line) => (
              <tr key={line.id}>
                <td>{line.title}</td>
                <td className="statement-table__num">{formatAmount(line.planned_minor)}</td>
                <td className="statement-table__num">{formatAmount(line.spent_minor)}</td>
                <td className="statement-table__num">{formatAmount(line.left_to_spend_minor)}</td>
              </tr>
            ))}
            {b.unallocated_spent_minor > 0 && (
              <tr>
                <td className="table__muted">Spent on no particular line</td>
                <td />
                <td className="statement-table__num">{formatAmount(b.unallocated_spent_minor)}</td>
                <td />
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="statement-table__num">{formatAmount(b.planned_minor)}</td>
              <td className="statement-table__num">{formatAmount(b.spent_minor)}</td>
              <td className="statement-table__num">{formatAmount(b.left_to_spend_minor)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <CampaignsSection
        onDone={onDone}
        budgetId={b.id}
        status={b.status === 'active' ? 'open' : 'closed'}
        title="Contributions"
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

      {b.status === 'active' && can('finance.expense.record') && (
        <div className="review-actions">
          <Button
            inline
            variant="secondary"
            icon={<IconSend />}
            onClick={() => setUsingPocket(true)}
          >
            Use pocket money
          </Button>
        </div>
      )}

      <RecordExpenseDialog
        open={usingPocket}
        budgetId={b.id}
        onClose={() => setUsingPocket(false)}
        onRecorded={() => {
          setUsingPocket(false);
          onDone(
            'Expense recorded. It shows as awaiting approval on the budget and counts once someone else approves it in Expenses & Income.',
          );
        }}
      />

      <Dialog
        open={closing}
        onClose={() => setClosing(false)}
        title="Close budget"
        subtitle="Its open collections close too. What is left stays in the cash box."
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
            placeholder="e.g. Event done; leftover stays in the wallet."
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
  /** Planning a new budget from an event's page: it belongs to that event. */
  event?: { id: string; title: string };
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={budget ? 'Edit budget' : event ? `Budget for ${event.title}` : 'New budget'}
      subtitle="Plan the spending in lines, and say what members pay towards it."
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

interface LineDraft {
  key: number;
  id?: string;
  title: string;
  planned: string;
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
  forEvent?: { id: string; title: string };
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId, can } = useWorkspace();
  const canAsk = can('finance.campaign.manage');
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const createAsk = useCreateCampaign();
  const updateAsk = useUpdateCampaign();
  const stopAsk = useCloseCampaign();
  // What members pay towards the budget: part of the budget, not a separate thing.
  const [ask, setAsk] = useState<Ask>(asking?.charge ?? 'none');
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
  const [askDue, setAskDue] = useState(asking?.due_date ?? '');
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(budget?.title ?? (forEvent ? `${forEvent.title} budget` : ''));
  const [description, setDescription] = useState(budget?.description ?? '');
  const [lines, setLines] = useState<LineDraft[]>(
    budget
      ? budget.lines.map((l, i) => ({
          key: i,
          id: l.id,
          title: l.title,
          planned: toRwf(l.planned_minor),
        }))
      : [{ key: 0, title: '', planned: '' }],
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = saving;
  const total = lines.reduce((sum, l) => sum + (toMinor(l.planned) || 0), 0);

  function setLine(key: number, patch: Partial<LineDraft>) {
    setLines((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (title.trim().length < 3)
      problems.title = 'Give the budget a title of at least 3 characters.';
    if (
      lines.some(
        (l) => l.title.trim().length < 2 || l.planned.trim() === '' || toMinor(l.planned) < 0,
      )
    )
      problems.lines = 'Each line needs a name (2+ characters) and a planned amount of 0 or more.';
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
      lines: lines.map((l) => ({
        ...(l.id ? { id: l.id } : {}),
        title: l.title.trim(),
        planned_minor: toMinor(l.planned),
      })),
    };
    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      const known = f.title || f.lines || f.amount_minor || f.due_date || f.category_amounts;
      setErrors({
        title: f.title,
        lines: f.lines,
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
      <fieldset className="budget-lines-editor">
        <legend className="field__label">Lines</legend>
        {lines.map((line, index) => (
          <div key={line.key} className="budget-lines-editor__row">
            <Input
              label={`Line ${index + 1}`}
              labelHidden
              placeholder="e.g. Venue"
              maxLength={160}
              value={line.title}
              onChange={(event) => setLine(line.key, { title: event.target.value })}
            />
            <Input
              label={`Line ${index + 1} planned (RWF)`}
              labelHidden
              type="number"
              min={0}
              step="any"
              placeholder="Planned RWF"
              value={line.planned}
              onChange={(event) => setLine(line.key, { planned: event.target.value })}
            />
            <Button
              variant="tint"
              size="sm"
              inline
              icon={<IconTrash />}
              aria-label={`Remove line ${index + 1}`}
              disabled={lines.length === 1}
              onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
            >
              {''}
            </Button>
          </div>
        ))}
        <div className="budget-lines-editor__foot">
          <Button
            variant="secondary"
            size="sm"
            inline
            icon={<IconPlus />}
            onClick={() => setLines((all) => [...all, { key: Date.now(), title: '', planned: '' }])}
          >
            Add line
          </Button>
          <span className="table__amount">Planned total: {formatAmount(total)} RWF</span>
        </div>
        {errors.lines && <p className="field__error">{errors.lines}</p>}
      </fieldset>
      {canAsk && (
        <fieldset className="budget-ask">
          <legend className="field__label">Members&apos; contribution</legend>
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
                {c.due_date && ` · due ${formatDate(c.due_date)}`}
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
              {budgetId && c.expected_minor !== null ? (
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
                <p className="table__muted">
                  {c.paid_count} of {c.member_count} members have paid
                  {c.pending_minor > 0 &&
                    reviewsContributions(can) &&
                    ` · ${formatAmount(c.pending_minor)} ${c.currency} awaiting review`}
                </p>
              )}
              {budgetId && (
                <div className="campaign-mine">
                  <strong>You:</strong>{' '}
                  {c.my_share.owed_minor === null
                    ? `voluntary · paid ${formatAmount(c.my_share.paid_minor)} ${c.currency}`
                    : c.my_share.owed_minor === 0
                      ? 'not asked to pay'
                      : `owe ${formatAmount(c.my_share.owed_minor)}, paid ${formatAmount(c.my_share.paid_minor)}${
                          c.my_share.outstanding_minor
                            ? `, ${formatAmount(c.my_share.outstanding_minor)} ${c.currency} still to pay`
                            : ' · all paid'
                        }`}
                </div>
              )}
              <div className="review-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  inline
                  icon={<IconFile />}
                  onClick={() => setPaymentsOf(c)}
                >
                  {budgetId ? 'Who paid' : 'Payments'}
                </Button>
                {c.status === 'open' &&
                  can('finance.contribution.record') &&
                  (c.my_share.outstanding_minor ?? 1) > 0 && (
                    <Button size="sm" inline onClick={() => setContributingTo(c)}>
                      Contribute
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
                amountMinor: contributingTo.my_share.outstanding_minor ?? undefined,
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
