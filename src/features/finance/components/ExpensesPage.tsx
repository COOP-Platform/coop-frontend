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
  SegmentedControl,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
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
import { Pager, ReasonPrompt } from './ReasonPrompt';
import { EditExpenseDialog } from './EditExpenseDialog';
import { RecordExpenseDialog } from './RecordExpenseDialog';
import { SuccessNotice } from './SuccessNotice';
import { SectionHeader } from './SectionHeader';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | ExpenseStatus;
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
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
  const { communityId, can, membership } = useWorkspace();
  const canRecord = can('finance.expense.record');
  const canApprove = can('finance.expense.approve');

  const [month, setMonth] = useState(THIS_MONTH);
  const [status, setStatus] = useState<StatusFilter>('all');
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
  const queue = useExpenses(canApprove ? communityId : undefined, {
    status: 'pending',
    page_size: 100,
  });

  const isOwn = (row: Expense) => row.recorded_by.membership_id === membership?.id;
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
  const waiting = (queue.data?.items ?? []).filter((row) => !isOwn(row));

  return (
    <div className="page">
      <SectionHeader
        embedded={embedded}
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Expenses"
        subtitle="Money paid out of the community, approved before it counts."
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

      <div className="stat-grid stat-grid--three">
        <StatCard
          label="Spent"
          value={<Money minor={summary.total_expenses_minor} currency={currency} />}
          caption={`${summary.approved_count} approved expense${summary.approved_count === 1 ? '' : 's'} in ${label}`}
          icon={<IconBadgeCheck />}
          tone="info"
        />
        <StatCard
          label="Awaiting approval"
          value={<Money minor={summary.pending_minor} currency={currency} />}
          caption={`${summary.pending_count} not yet counted`}
          icon={<IconClipboardClock />}
          tone="warning"
          emphasis={summary.pending_count > 0}
        />
        <StatCard
          label="Recorded"
          value={summary.count}
          caption={`Expenses of any status in ${label}`}
          icon={<IconFile />}
          tone="brand"
        />
      </div>

      {canApprove && waiting.length > 0 && (
        <section className="card table-card" aria-labelledby="exp-queue-title">
          <header className="table-card__head">
            <h2 id="exp-queue-title" className="section-head__title">
              Waiting for your approval <Badge tone="warning">{waiting.length}</Badge>
            </h2>
            <p className="section-head__subtitle">
              Recorded by someone else. Check the receipt, then approve or reject.
            </p>
          </header>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Expense</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Recorded by</th>
                  <th scope="col" className="table__action-col">
                    Decision
                  </th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((row) => (
                  <tr
                    key={row.id}
                    className="table__row--clickable"
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest('button')) setSelected(row);
                    }}
                  >
                    <td>
                      <ExpenseCell row={row} />
                    </td>
                    <td>
                      <span className="table__stack">
                        <span className="table__amount">
                          <Money minor={row.amount_minor} currency={row.currency} />
                        </span>
                        <span className="table__muted">Paid {formatDate(row.spent_at)}</span>
                      </span>
                    </td>
                    <td>{row.recorded_by.full_name}</td>
                    <td className="table__action-col">
                      <ExpenseActions row={row} compact onDone={done} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="toolbar card">
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
            placeholder="Search title, payee, reference or category..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="toolbar__controls">
          <SegmentedControl
            label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <section className="card table-card" aria-labelledby="exp-all-title">
        <header className="table-card__head">
          <h2 id="exp-all-title" className="section-head__title">
            Expenses in {label}
          </h2>
          <p className="section-head__subtitle">
            Every member can read these; open one for details.
          </p>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={<IconSend width={28} height={28} />}
            title={`No expenses in ${label}`}
            message={
              status === 'all' && !search
                ? 'Expenses the Treasurer records will show here.'
                : 'Nothing matches these filters.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Expense</th>
                  <th scope="col">Paid to</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__action-col">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const badge = EXPENSE_STATUS[row.status];
                  const method = row.payment_method ? METHOD_LABEL[row.payment_method] : NO_METHOD;
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
                      <td>
                        <span className="table__stack">
                          <span>{row.payee ?? '—'}</span>
                          <span className="table__muted">{method.label}</span>
                        </span>
                      </td>
                      <td>
                        <span className="table__stack">
                          <span className="table__amount">
                            <Money minor={row.amount_minor} currency={row.currency} />
                          </span>
                          <span className="table__muted">{formatDate(row.spent_at)}</span>
                        </span>
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
                          View details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <footer className="table-footer">
          <p className="table-footer__summary">
            Showing <strong>{items.length}</strong> of <strong>{total}</strong> expenses
          </p>
          <Pager
            page={page}
            pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            onChange={setPage}
          />
        </footer>
      </section>

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
            `${expense.description} (${formatAmount(expense.amount_minor)} ${expense.currency}) recorded. It counts once another approver approves it.`,
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
function ExpenseActions({
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
        subtitle="It is taken back out of every total; the record stays. Record it again if the amount was wrong."
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
      return compact ? null : (
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
