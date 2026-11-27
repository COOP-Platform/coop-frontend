import { useId, useState } from 'react';

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconBadgeCheck,
  IconBan,
  IconCheckCircle,
  IconClipboardClock,
  IconDownload,
  IconEye,
  IconFile,
  IconHistory,
  IconPencil,
  IconSearch,
  IconSend,
  LoadingState,
  SectionCard,
  Select,
  StatCard,
  TableFooter,
} from '@/components/ui';
import { reviewsExpenses, useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import {
  downloadExpensesCsv,
  useApproveExpense,
  useExpenseDetail,
  useExpenses,
  useRejectExpense,
  useReverseExpense,
} from '../api/expenses';
import type { Expense, ExpenseStatus } from '../api/expenses';
import { formatAmount } from '../format';
import { EXPENSE_STATUS, METHOD_LABEL, NO_METHOD, humanize } from '../labels';
import { THIS_MONTH, monthName } from '../month';
import { CashBoxLine } from './CashBox';
import { Money } from './Money';
import { MonthPicker } from './MonthPicker';
import { ReasonPrompt } from './ReasonPrompt';
import { EditExpenseDialog } from './EditExpenseDialog';
import { RecordExpenseDialog } from './RecordExpenseDialog';
import { ExpenseReview } from './ExpenseReview';
import { SuccessNotice } from './SuccessNotice';
import { SectionHeader } from './SectionHeader';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | ExpenseStatus;
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reversed', label: 'Reversed' },
];

/**
 * Money out of the community (backend S3-08). Every member reads every
 * expense; the Treasurer records them; someone else approves or rejects;
 * an approved one can be reversed with a reason.
 */
export function ExpensesPage({
  startRecording = false,
  embedded = false,
}: {
  startRecording?: boolean;
  embedded?: boolean;
}) {
  const searchId = useId();
  const { communityId, can } = useWorkspace();
  const canRecord = can('finance.expense.record');

  const [month, setMonth] = useState(THIS_MONTH);
  // Only approvers see pending, rejected and reversed expenses.
  const reviews = reviewsExpenses(can);
  const [chosenStatus, setStatus] = useState<StatusFilter>('all');
  const status: StatusFilter = reviews ? chosenStatus : 'approved';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [recording, setRecording] = useState(startRecording && canRecord);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = {
    month,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
    page,
    page_size: PAGE_SIZE,
  };
  const list = useExpenses(communityId, filters);

  function done(message: string) {
    setNotice(message);
    setSelected(null);
  }

  if (list.data === undefined) {
    return list.isPending ? <LoadingState /> : <ErrorState message={errorMessage(list.error)} />;
  }
  const { items, total, summary } = list.data;
  const currency = summary.currency;
  const label = monthName(month);

  return (
    <div className="page">
      <SectionHeader
        embedded={embedded}
        title="Expenses"
        actions={
          <>
            <MonthPicker
              value={month}
              onChange={(value) => {
                setMonth(value);
                setPage(1);
              }}
            />
            <Button
              variant="secondary"
              inline
              icon={<IconDownload />}
              onClick={() => {
                if (!communityId) return;
                setExportError(null);
                downloadExpensesCsv(communityId, filters).catch((error: unknown) =>
                  setExportError(errorMessage(error)),
                );
              }}
            >
              Export CSV
            </Button>
            {canRecord && (
              <Button inline icon={<IconSend />} onClick={() => setRecording(true)}>
                Record Expense
              </Button>
            )}
          </>
        }
      />

      {notice && <SuccessNotice text={notice} />}

      <CashBoxLine />
      {exportError && (
        <p className="table__warn" role="alert">
          {exportError}
        </p>
      )}

      <div className="stat-grid">
        <StatCard
          label="Spent"
          value={<Money minor={summary.total_expenses_minor} currency={currency} />}
          caption={`${summary.approved_count} approved`}
          icon={<IconBadgeCheck />}
          tone="info"
        />
        {reviews && (
          <StatCard
            label="Awaiting approval"
            value={<Money minor={summary.pending_minor} currency={currency} />}
            caption={
              summary.pending_count > 0 ? (
                <b className="caption-warn">{summary.pending_count} pending</b>
              ) : (
                'None pending'
              )
            }
            icon={<IconClipboardClock />}
            tone="warning"
            emphasis={summary.pending_count > 0}
          />
        )}
        <StatCard
          label="Recorded"
          value={summary.count}
          caption={label}
          icon={<IconFile />}
          tone="brand"
        />
      </div>

      {(can('finance.expense.approve') || canRecord) && <ExpenseReview onDone={done} />}

      <SectionCard
        title={`Expenses in ${label}`}
        actions={
          <>
            <div className="search-field">
              <label htmlFor={searchId} className="visually-hidden">
                Search expenses
              </label>
              <span className="search-field__icon" aria-hidden="true">
                <IconSearch />
              </span>
              <input
                id={searchId}
                type="search"
                className="search-field__input"
                placeholder="Search…"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {reviews && (
              <Select
                label="Status"
                labelHidden
                options={STATUS_OPTIONS}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as StatusFilter);
                  setPage(1);
                }}
              />
            )}
          </>
        }
        flush
        footer={
          <TableFooter
            from={total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}
            to={(page - 1) * PAGE_SIZE + items.length}
            total={total}
            page={page}
            pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            onPage={setPage}
          />
        }
      >
        {items.length === 0 ? (
          <EmptyState
            icon={<IconSend width={28} height={28} />}
            title={`No expenses in ${label}`}
            message={status === 'all' && !search ? undefined : 'Nothing matches these filters.'}
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Expense</th>
                  <th scope="col">Paid to</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__action-col">
                    <span className="visually-hidden">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const badge = EXPENSE_STATUS[row.status];
                  return (
                    <tr
                      key={row.id}
                      className={
                        row.id === selected?.id
                          ? 'table__row--clickable is-selected'
                          : 'table__row--clickable'
                      }
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest('button')) setSelected(row);
                      }}
                    >
                      <td>
                        <ExpenseCell row={row} />
                      </td>
                      <td>{row.payee ?? '—'}</td>
                      <td>{formatDate(row.spent_at)}</td>
                      <td className="num table__amount">
                        <Money minor={row.amount_minor} currency={row.currency} />
                      </td>
                      <td>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className="table__action-col">
                        <button
                          type="button"
                          className="link-action"
                          aria-haspopup="dialog"
                          onClick={() => setSelected(row)}
                        >
                          <IconEye width={16} height={16} aria-hidden="true" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        label={selected ? `Expense: ${selected.description}` : 'Expense details'}
      >
        {selected && <ExpenseDetails expense={selected} onDone={done} />}
      </Drawer>

      <RecordExpenseDialog
        open={recording}
        onClose={() => setRecording(false)}
        onRecorded={(expense) => {
          setRecording(false);
          setNotice(
            `${expense.description} (${formatAmount(expense.amount_minor)} ${expense.currency}) recorded. It counts once someone else approves it.`,
          );
        }}
      />
    </div>
  );
}

function ExpenseCell({ row }: { row: Expense }) {
  return (
    <span className="table__stack">
      <span className="table__name">{row.description}</span>
      <span className="table__muted">
        {[row.category, row.budget?.title].filter(Boolean).join(' · ') || 'Uncategorised'}
      </span>
    </span>
  );
}

/** Approve / Reject while pending; Reverse once approved. Never on your own record. */
export function ExpenseActions({
  row,
  compact = false,
  onDone,
}: {
  row: Expense;
  compact?: boolean;
  onDone: (message: string) => void;
}) {
  const { communityId, can, membership } = useWorkspace();
  const approve = useApproveExpense();
  const reject = useRejectExpense();
  const reverse = useReverseExpense();
  const [prompt, setPrompt] = useState<'reject' | 'reverse' | null>(null);

  if (communityId === undefined) return null;
  const own = row.recorded_by.membership_id === membership?.id;
  const amount = `${formatAmount(row.amount_minor)} ${row.currency}`;
  const ids = { communityId, expenseId: row.id };

  const prompts = (
    <>
      <ReasonPrompt
        open={prompt === 'reject'}
        title="Reject expense"
        subtitle="It never counts. The reason stays on the record."
        icon={<IconBan />}
        about={`${row.description} · ${amount}`}
        placeholder="e.g. No receipt, or the amount is wrong."
        confirmLabel="Reject expense"
        busy={reject.isPending}
        onClose={() => setPrompt(null)}
        onSubmit={(reason) =>
          reject.mutateAsync({ ...ids, reason }).then(() => {
            setPrompt(null);
            onDone(`${row.description} (${amount}) rejected.`);
          })
        }
      />
      <ReasonPrompt
        open={prompt === 'reverse'}
        title="Reverse expense"
        subtitle="Taken out of every total; the record stays."
        icon={<IconHistory />}
        about={`${row.description} · ${amount}`}
        placeholder="e.g. The payment was refunded."
        confirmLabel="Reverse expense"
        busy={reverse.isPending}
        onClose={() => setPrompt(null)}
        onSubmit={(reason) =>
          reverse.mutateAsync({ ...ids, reason }).then(() => {
            setPrompt(null);
            onDone(`${row.description} (${amount}) reversed.`);
          })
        }
      />
    </>
  );

  if (row.status === 'pending' && can('finance.expense.approve')) {
    if (own) {
      return compact ? (
        <span className="table__muted">Awaiting another approver</span>
      ) : (
        <p className="details__note">You recorded this, so another approver has to decide it.</p>
      );
    }
    return (
      <div className={compact ? 'review-actions review-actions--compact' : 'review-actions'}>
        <Button
          inline
          size={compact ? 'sm' : undefined}
          icon={<IconCheckCircle />}
          disabled={approve.isPending}
          onClick={() =>
            approve.mutate(ids, {
              onSuccess: () => onDone(`${row.description} (${amount}) approved.`),
            })
          }
        >
          {approve.isPending ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          inline
          size={compact ? 'sm' : undefined}
          variant="secondary"
          icon={<IconBan />}
          onClick={() => setPrompt('reject')}
        >
          Reject
        </Button>
        {approve.error && (
          <p className="table__warn" role="alert">
            {errorMessage(approve.error)}
          </p>
        )}
        {prompts}
      </div>
    );
  }

  if (row.status === 'approved' && can('finance.expense.reverse') && !compact) {
    return (
      <div className="review-actions">
        <Button
          variant="secondary"
          inline
          icon={<IconHistory />}
          onClick={() => setPrompt('reverse')}
        >
          Reverse expense
        </Button>
        {prompts}
      </div>
    );
  }
  return null;
}

function ExpenseDetails({ expense, onDone }: { expense: Expense; onDone: (m: string) => void }) {
  const { communityId, can } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const detail = useExpenseDetail(communityId, expense.id);
  const row = detail.data ?? expense;
  const badge = EXPENSE_STATUS[row.status];
  const method = row.payment_method ? METHOD_LABEL[row.payment_method] : NO_METHOD;

  return (
    <section className="details" aria-labelledby="expense-details-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">Expense</p>
          <h2 id="expense-details-title" className="section-head__title">
            {row.description}
          </h2>
          <p className="section-head__subtitle">{formatLongDate(row.spent_at)}</p>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </header>

      <div className="details__person">
        <div className="table__stack">
          <span className="table__muted">Amount</span>
          <span className="details__name">
            <Money minor={row.amount_minor} currency={row.currency} />
          </span>
        </div>
      </div>

      <dl className="details__list">
        <Row label="Category" value={row.category ? humanize(row.category) : '—'} />
        <Row label="Paid to" value={row.payee ?? '—'} />
        <Row label="Method" value={method.label} />
        {row.payment_reference && <Row label="Reference" value={row.payment_reference} mono />}
        {row.budget && <Row label="Budget" value={row.budget.title} />}
        <Row
          label="Recorded by"
          value={`${row.recorded_by.full_name} · ${formatDate(row.created_at)}`}
        />
        {row.approved_by && row.approved_at && (
          <Row
            label="Approved by"
            value={`${row.approved_by.full_name} · ${formatDate(row.approved_at)}`}
          />
        )}
        {row.rejected_by && row.rejected_at && (
          <Row
            label="Rejected by"
            value={`${row.rejected_by.full_name} · ${formatDate(row.rejected_at)}`}
          />
        )}
        {row.reversed_by && row.reversed_at && (
          <Row
            label="Reversed by"
            value={`${row.reversed_by.full_name} · ${formatDate(row.reversed_at)}`}
          />
        )}
        <div>
          <dt>Receipt</dt>
          <dd>
            {detail.data?.receipt_url ? (
              <a href={detail.data.receipt_url} target="_blank" rel="noreferrer">
                Open receipt
              </a>
            ) : row.has_receipt ? (
              'Attached'
            ) : (
              'None'
            )}
          </dd>
        </div>
      </dl>

      {row.memo && <p className="details__note">{row.memo}</p>}
      {row.rejection_reason && (
        <p className="details__note" role="note">
          <strong>Rejected:</strong> {row.rejection_reason}
        </p>
      )}
      {row.reversal_reason && (
        <p className="details__note" role="note">
          <strong>Reversed:</strong> {row.reversal_reason}
        </p>
      )}
      {detail.error && (
        <p className="table__warn" role="alert">
          {errorMessage(detail.error)}
        </p>
      )}

      {can('finance.expense.record') && (row.status === 'pending' || row.status === 'approved') && (
        <div className="review-actions">
          <Button variant="tint" inline icon={<IconPencil />} onClick={() => setEditing(true)}>
            Edit details
          </Button>
        </div>
      )}

      <ExpenseActions row={row} onDone={onDone} />

      <EditExpenseDialog
        expense={editing ? row : null}
        onClose={() => setEditing(false)}
        onSaved={(message) => {
          setEditing(false);
          onDone(message);
        }}
      />
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{value}</dd>
    </div>
  );
}
