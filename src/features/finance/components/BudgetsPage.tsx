import { Link } from '@tanstack/react-router';
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
  IconHandHeart,
  IconPencil,
  IconPlus,
  IconTile,
  IconTrash,
  Input,
  LoadingState,
  PageHeader,
  SegmentedControl,
  Select,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
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
import type { Budget, BudgetDetail, Campaign } from '../api/budgets';
import { MINOR_PER_MAJOR, formatAmount } from '../format';
import { SuccessNotice } from './SuccessNotice';

type Section = 'budgets' | 'campaigns';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'budgets', label: 'Budgets' },
  { value: 'campaigns', label: 'Dedicated contributions' },
];

const today = () => new Date().toLocaleDateString('en-CA');
const toMinor = (rwf: string) => Math.round(Number(rwf) * MINOR_PER_MAJOR);
const toRwf = (minor: number) => String(minor / MINOR_PER_MAJOR);

/**
 * Budgets (S3-37) and dedicated contributions (S3-38). A budget plans spending
 * for an event or project in lines; a dedicated contribution collects money
 * from members for it. Every member reads them; the Treasurer and committee
 * (finance.budget.manage / finance.campaign.manage) change them.
 */
export function BudgetsPage({
  section,
  onSectionChange,
}: {
  section: Section;
  onSectionChange: (s: Section) => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Budgets"
        subtitle="Plan spending for events and projects, and collect dedicated contributions for them."
      />
      <SegmentedControl
        label="Section"
        options={SECTIONS}
        value={section}
        onChange={(value) => {
          setNotice(null);
          onSectionChange(value);
        }}
      />
      {notice && <SuccessNotice text={notice} />}
      {section === 'budgets' ? (
        <BudgetsSection onDone={setNotice} />
      ) : (
        <CampaignsSection onDone={setNotice} />
      )}
    </div>
  );
}

export type BudgetsSectionName = Section;

/** A thin bar for "x of y", with the numbers written beside it. */
function Meter({
  label,
  value,
  of,
  currency,
  tone,
}: {
  label: string;
  value: number;
  of: number;
  currency: string;
  tone: 'in' | 'out';
}) {
  const percent = of > 0 ? Math.min(100, (value / of) * 100) : 0;
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
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budgets
// ---------------------------------------------------------------------------

type BudgetFilter = 'active' | 'closed';

function BudgetsSection({ onDone }: { onDone: (message: string) => void }) {
  const { communityId, can } = useWorkspace();
  const canManage = can('finance.budget.manage');
  const [filter, setFilter] = useState<BudgetFilter>('active');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const budgets = useBudgets(communityId, filter);

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">Budgets</h2>
          <p className="table__muted">
            Planned, raised from dedicated contributions, and spent through approved expenses.
          </p>
        </div>
        <div className="section-bar__actions">
          <SegmentedControl
            label="Status"
            options={[
              { value: 'active', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
            value={filter}
            onChange={setFilter}
          />
          {canManage && (
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
            title={filter === 'active' ? 'No open budgets' : 'No closed budgets'}
            message="A budget plans what an event or project will cost, line by line."
          />
        </section>
      ) : (
        <ul className="budget-cards" role="list">
          {budgets.data.items.map((budget) => (
            <li key={budget.id}>
              <BudgetCard budget={budget} onOpen={() => setOpenId(budget.id)} />
            </li>
          ))}
        </ul>
      )}

      <BudgetFormDialog
        open={creating}
        budget={null}
        onClose={() => setCreating(false)}
        onSaved={(message) => {
          setCreating(false);
          onDone(message);
        }}
      />

      <Drawer open={openId !== null} onClose={() => setOpenId(null)} label="Budget details">
        {openId && (
          <BudgetDetails
            budgetId={openId}
            onDone={(message) => {
              setOpenId(null);
              onDone(message);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function BudgetCard({ budget, onOpen }: { budget: Budget; onOpen: () => void }) {
  return (
    <button type="button" className="card budget-card" onClick={onOpen}>
      <div className="budget-card__head">
        <h3 className="budget-card__title">{budget.title}</h3>
        <Badge tone={budget.status === 'active' ? 'success' : 'neutral'}>
          {budget.status === 'active' ? 'Open' : 'Closed'}
        </Badge>
      </div>
      {budget.event && (
        <p className="table__muted">
          <IconCalendar width={14} height={14} aria-hidden="true" /> {budget.event.title}
        </p>
      )}
      <p className="budget-card__planned">
        {formatAmount(budget.planned_minor)}{' '}
        <span className="money__unit">{budget.currency} planned</span>
      </p>
      <Meter
        label="Raised"
        value={budget.raised_minor}
        of={budget.planned_minor}
        currency={budget.currency}
        tone="in"
      />
      <Meter
        label="Spent"
        value={budget.spent_minor}
        of={budget.planned_minor}
        currency={budget.currency}
        tone="out"
      />
      <p className="budget-card__left">
        {budget.left_to_spend_minor >= 0
          ? `${formatAmount(budget.left_to_spend_minor)} ${budget.currency} left to spend`
          : `Overspent by ${formatAmount(-budget.left_to_spend_minor)} ${budget.currency}`}
        {budget.from_wallet_minor > 0 &&
          ` · ${formatAmount(budget.from_wallet_minor)} taken from the cash box`}
      </p>
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
  const [openingCampaign, setOpeningCampaign] = useState(false);

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
      />

      <h3 className="details__subhead">Lines</h3>
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

      <h3 className="details__subhead">Dedicated contributions for it</h3>
      {b.campaigns.length === 0 ? (
        <p className="table__muted">None yet.</p>
      ) : (
        <ul className="budget-campaigns" role="list">
          {b.campaigns.map((c) => (
            <li key={c.id}>
              <span className="table__name">{c.title}</span>{' '}
              <Badge tone={c.status === 'open' ? 'success' : 'neutral'}>
                {c.status === 'open' ? 'Open' : 'Closed'}
              </Badge>
              <span className="table__muted">
                {' '}
                · {formatAmount(c.collected_minor)}
                {c.expected_minor !== null && ` of ${formatAmount(c.expected_minor)}`} {b.currency}{' '}
                collected
              </span>
            </li>
          ))}
        </ul>
      )}

      {b.close_note && (
        <p className="details__note">
          <strong>Closed:</strong> {b.close_note}
        </p>
      )}

      {canManage && (
        <div className="review-actions">
          {can('finance.campaign.manage') && (
            <Button inline icon={<IconHandHeart />} onClick={() => setOpeningCampaign(true)}>
              Collect for it
            </Button>
          )}
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
        onClose={() => setEditing(false)}
        onSaved={(message) => {
          setEditing(false);
          onDone(message);
        }}
      />

      <CampaignFormDialog
        open={openingCampaign}
        campaign={null}
        budgetId={b.id}
        onClose={() => setOpeningCampaign(false)}
        onSaved={(message) => {
          setOpeningCampaign(false);
          onDone(message);
        }}
      />

      <Dialog
        open={closing}
        onClose={() => setClosing(false)}
        title="Close budget"
        subtitle="Its open dedicated contributions close too. Whatever is left stays in the cash box."
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

function BudgetFormDialog({
  open,
  budget,
  onClose,
  onSaved,
}: {
  open: boolean;
  budget: BudgetDetail | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={budget ? 'Edit budget' : 'New budget'}
      subtitle="List what it will cost, line by line. The planned total is the sum of the lines."
      icon={
        <IconTile tone="brand" round>
          <IconFlag />
        </IconTile>
      }
    >
      {open && <BudgetForm budget={budget} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

interface LineDraft {
  key: number;
  id?: string;
  title: string;
  planned: string;
}

function BudgetForm({
  budget,
  onClose,
  onSaved,
}: {
  budget: BudgetDetail | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const [title, setTitle] = useState(budget?.title ?? '');
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
  const busy = create.isPending || update.isPending;
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
      setErrors({
        title: f.title,
        lines: f.lines,
        form: f.title || f.lines ? undefined : errorMessage(error),
      });
    };
    if (budget) {
      update.mutate(
        { ...body, budgetId: budget.id },
        { onSuccess: () => onSaved(`${body.title} saved.`), onError },
      );
    } else {
      create.mutate(body, { onSuccess: () => onSaved(`${body.title} created.`), onError });
    }
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

function CampaignsSection({ onDone }: { onDone: (message: string) => void }) {
  const { communityId, can } = useWorkspace();
  const canManage = can('finance.campaign.manage');
  const [filter, setFilter] = useState<CampaignFilter>('open');
  const [editing, setEditing] = useState<Campaign | 'new' | null>(null);
  const [closingId, setClosingId] = useState<Campaign | null>(null);
  const close = useCloseCampaign();
  const campaigns = useCampaigns(communityId, filter);

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">Dedicated contributions</h2>
          <p className="table__muted">
            Money collected from members for one purpose, e.g. a celebration or a family event.
          </p>
        </div>
        <div className="section-bar__actions">
          <SegmentedControl
            label="Status"
            options={[
              { value: 'open', label: 'Open' },
              { value: 'closed', label: 'Closed' },
            ]}
            value={filter}
            onChange={setFilter}
          />
          {canManage && (
            <Button inline icon={<IconPlus />} onClick={() => setEditing('new')}>
              New collection
            </Button>
          )}
        </div>
      </div>

      {campaigns.data === undefined ? (
        campaigns.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(campaigns.error)} />
        )
      ) : campaigns.data.items.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<IconHandHeart />}
            title={filter === 'open' ? 'No open collections' : 'No closed collections'}
            message="When the committee collects for an event, it shows here with what you owe."
          />
        </section>
      ) : (
        <ul className="budget-cards" role="list">
          {campaigns.data.items.map((c) => (
            <li key={c.id} className="card budget-card budget-card--static">
              <div className="budget-card__head">
                <h3 className="budget-card__title">{c.title}</h3>
                <Badge tone={c.status === 'open' ? 'success' : 'neutral'}>
                  {c.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <p className="table__muted">
                {formatAmount(c.amount_minor)} {c.currency}{' '}
                {c.charge === 'per_share' ? 'per share' : 'per member'} ·{' '}
                {c.required ? 'Required' : 'Voluntary'}
                {c.due_date && ` · due ${formatDate(c.due_date)}`}
                {c.budget && ` · for ${c.budget.title}`}
              </p>
              {c.expected_minor !== null ? (
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
              <p className="table__muted">
                {c.paid_count} of {c.member_count} members have paid
                {c.pending_minor > 0 &&
                  ` · ${formatAmount(c.pending_minor)} ${c.currency} awaiting review`}
              </p>
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
              <div className="review-actions">
                {c.status === 'open' &&
                  can('finance.contribution.record') &&
                  (c.my_share.outstanding_minor ?? 1) > 0 && (
                    <Link
                      to="/finance/my-contributions"
                      search={{ record: true }}
                      className="btn btn--primary btn--sm btn--inline"
                    >
                      Pay now
                    </Link>
                  )}
                {canManage && c.status === 'open' && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      inline
                      icon={<IconPencil />}
                      onClick={() => setEditing(c)}
                    >
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" inline onClick={() => setClosingId(c)}>
                      Close
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

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

function CampaignFormDialog({
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
      subtitle="Members see what they owe and pay it from My Contributions."
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
  const [charge, setCharge] = useState<'per_share' | 'fixed'>(campaign?.charge ?? 'per_share');
  const [amount, setAmount] = useState(campaign ? toRwf(campaign.amount_minor) : '');
  const [required, setRequired] = useState(campaign?.required ?? true);
  const [dueDate, setDueDate] = useState(campaign?.due_date ?? '');
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = create.isPending || update.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    if (title.trim().length < 3) problems.title = 'Give it a title of at least 3 characters.';
    if (amount.trim() === '' || toMinor(amount) < 0)
      problems.amount = 'Enter an amount, 0 or more.';
    if (dueDate && dueDate < today()) problems.due_date = 'The due date is today or later.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;

    const body = {
      communityId,
      title: title.trim(),
      description: description.trim() || null,
      charge,
      amount_minor: toMinor(amount),
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
          onChange={(event) => setCharge(event.target.value as 'per_share' | 'fixed')}
          options={[
            { value: 'per_share', label: 'An amount per share' },
            { value: 'fixed', label: 'The same amount per member' },
          ]}
        />
        <Input
          label={charge === 'per_share' ? 'Amount per share (RWF)' : 'Amount per member (RWF)'}
          type="number"
          min={0}
          step="any"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={errors.amount}
          required
        />
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
        label="Required: members owe it (untick for a voluntary collection)"
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
