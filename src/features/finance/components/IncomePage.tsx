import { useId, useState } from 'react';

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconBan,
  IconCheckCircle,
  IconEye,
  IconHistory,
  IconPiggyBank,
  IconSearch,
  IconWallet,
  IconClipboardClock,
  LoadingState,
  SectionCard,
  Select,
  StatCard,
  TableFooter,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import {
  useApproveIncome,
  useIncomeDetail,
  useIncomeList,
  useRejectIncome,
  useReverseIncome,
} from '../api/income';
import type { Income, IncomeSource, IncomeStatus } from '../api/income';
import { formatAmount } from '../format';
import { INCOME_SOURCE, INCOME_STATUS, METHOD_LABEL, NO_METHOD } from '../labels';
import { THIS_MONTH, monthName } from '../month';
import { CashBoxLine } from './CashBox';
import { Money } from './Money';
import { MonthPicker } from './MonthPicker';
import { ReasonPrompt } from './ReasonPrompt';
import { RecordIncomeDialog } from './RecordIncomeDialog';
import { SuccessNotice } from './SuccessNotice';
import { SectionHeader } from './SectionHeader';

const PAGE_SIZE = 20;

type SourceFilter = 'all' | IncomeSource;
const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'donation', label: 'Donations' },
  { value: 'event_revenue', label: 'Events' },
  { value: 'interest', label: 'Interest' },
  { value: 'other', label: 'Other' },
];

type StatusFilter = 'all' | IncomeStatus;
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Waiting' },
  { value: 'recorded', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reversed', label: 'Reversed' },
];

/**
 * Money in that is not a member's contribution (backend S3-35). It waits for
 * someone other than the recorder to approve it, then counts in the wallet;
 * every member reads it; a mistake is reversed with a reason, never edited or
 * deleted.
 */
export function IncomePage({
  startRecording = false,
  embedded = false,
}: {
  startRecording?: boolean;
  embedded?: boolean;
}) {
  const searchId = useId();
  const { communityId, can } = useWorkspace();
  const canRecord = can('finance.income.record');

  const [month, setMonth] = useState(THIS_MONTH);
  const [source, setSource] = useState<SourceFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Income | null>(null);
  const [recording, setRecording] = useState(startRecording && canRecord);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useIncomeList(communityId, {
    month,
    source: source === 'all' ? undefined : source,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  if (list.data === undefined) {
    return list.isPending ? <LoadingState /> : <ErrorState message={errorMessage(list.error)} />;
  }
  const { items, total, summary } = list.data;
  const label = monthName(month);

  return (
    <div className="page">
      <SectionHeader
        embedded={embedded}
        title="Income"
        actions={
          <>
            <MonthPicker
              value={month}
              onChange={(value) => {
                setMonth(value);
                setPage(1);
              }}
            />
            {canRecord && (
              <Button inline icon={<IconPiggyBank />} onClick={() => setRecording(true)}>
                Record Income
              </Button>
            )}
          </>
        }
      />

      {notice && <SuccessNotice text={notice} />}

      <CashBoxLine />

      <div className="stat-grid">
        <StatCard
          label="Income"
          value={<Money minor={summary.total_income_minor} currency={summary.currency} />}
          caption={`${summary.count} approved`}
          icon={<IconWallet />}
          tone="brand"
        />
        <StatCard
          label="Waiting for approval"
          value={<Money minor={summary.pending_minor} currency={summary.currency} />}
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
        <StatCard
          label="Reversed"
          value={summary.reversed_count}
          caption="Kept on record"
          icon={<IconHistory />}
          tone="neutral"
        />
      </div>

      <SectionCard
        title={`Income in ${label}`}
        actions={
          <>
            <div className="search-field">
              <label htmlFor={searchId} className="visually-hidden">
                Search income
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
            <Select
              label="Source"
              labelHidden
              options={SOURCE_OPTIONS}
              value={source}
              onChange={(event) => {
                setSource(event.target.value as SourceFilter);
                setPage(1);
              }}
            />
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
            icon={<IconPiggyBank width={28} height={28} />}
            title={`No income in ${label}`}
            message={
              source === 'all' && status === 'all' && !search
                ? undefined
                : 'Nothing matches these filters.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Income</th>
                  <th scope="col">From</th>
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
                  const badge = INCOME_STATUS[row.status];
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
                        <span className="table__stack">
                          <span className="table__name">{row.title}</span>
                          <span className="table__muted">{INCOME_SOURCE[row.source]}</span>
                        </span>
                      </td>
                      <td>{row.received_from ?? '—'}</td>
                      <td>{formatDate(row.received_on)}</td>
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
        label={selected ? `Income: ${selected.title}` : 'Income details'}
      >
        {selected && (
          <IncomeDetails
            income={selected}
            onDone={(message) => {
              setNotice(message);
              setSelected(null);
            }}
          />
        )}
      </Drawer>

      <RecordIncomeDialog
        open={recording}
        onClose={() => setRecording(false)}
        onRecorded={(income) => {
          setRecording(false);
          setNotice(
            income.status === 'pending'
              ? `${income.title} (${formatAmount(income.amount_minor)} ${income.currency}) recorded. It counts once someone else approves it.`
              : `${income.title} (${formatAmount(income.amount_minor)} ${income.currency}) recorded and counted in the wallet.`,
          );
        }}
      />
    </div>
  );
}

function IncomeDetails({ income, onDone }: { income: Income; onDone: (m: string) => void }) {
  const { communityId, can } = useWorkspace();
  const detail = useIncomeDetail(communityId, income.id);
  const reverse = useReverseIncome();
  const [reversing, setReversing] = useState(false);
  const row = detail.data ?? income;
  const badge = INCOME_STATUS[row.status];
  const method = row.payment_method ? METHOD_LABEL[row.payment_method] : NO_METHOD;
  const amount = `${formatAmount(row.amount_minor)} ${row.currency}`;

  return (
    <section className="details" aria-labelledby="income-details-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">Income · {INCOME_SOURCE[row.source]}</p>
          <h2 id="income-details-title" className="section-head__title">
            {row.title}
          </h2>
          <p className="section-head__subtitle">{formatLongDate(row.received_on)}</p>
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
        <div>
          <dt>Received from</dt>
          <dd>{row.received_from ?? '—'}</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>{method.label}</dd>
        </div>
        {row.payment_reference && (
          <div>
            <dt>Reference</dt>
            <dd className="mono">{row.payment_reference}</dd>
          </div>
        )}
        <div>
          <dt>Recorded by</dt>
          <dd>
            {row.recorded_by.full_name} · {formatDate(row.created_at)}
          </dd>
        </div>
        {row.approved_by && row.approved_at && (
          <div>
            <dt>Approved by</dt>
            <dd>
              {row.approved_by.full_name} · {formatDate(row.approved_at)}
            </dd>
          </div>
        )}
        {row.rejected_by && row.rejected_at && (
          <div>
            <dt>Rejected by</dt>
            <dd>
              {row.rejected_by.full_name} · {formatDate(row.rejected_at)}
            </dd>
          </div>
        )}
        {row.reversed_by && row.reversed_at && (
          <div>
            <dt>Reversed by</dt>
            <dd>
              {row.reversed_by.full_name} · {formatDate(row.reversed_at)}
            </dd>
          </div>
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

      <IncomeApproval row={row} onDone={onDone} />

      {row.status === 'recorded' && can('finance.income.reverse') && communityId && (
        <div className="review-actions">
          <Button
            variant="secondary"
            inline
            icon={<IconHistory />}
            onClick={() => setReversing(true)}
          >
            Reverse income
          </Button>
          <ReasonPrompt
            open={reversing}
            title="Reverse income"
            subtitle="Taken out of every total; the record stays."
            icon={<IconHistory />}
            about={`${row.title} · ${amount}`}
            placeholder="e.g. Recorded twice."
            confirmLabel="Reverse income"
            busy={reverse.isPending}
            onClose={() => setReversing(false)}
            onSubmit={(reason) =>
              reverse.mutateAsync({ communityId, incomeId: row.id, reason }).then(() => {
                setReversing(false);
                onDone(`${row.title} (${amount}) reversed.`);
              })
            }
          />
        </div>
      )}
    </section>
  );
}

/**
 * Approve or reject pending income, from its details. The server says who may
 * (`can_approve`): never the person who recorded it.
 */
function IncomeApproval({ row, onDone }: { row: Income; onDone: (m: string) => void }) {
  const { communityId, can, membership } = useWorkspace();
  const approve = useApproveIncome();
  const reject = useRejectIncome();
  const [rejecting, setRejecting] = useState(false);

  if (row.status !== 'pending' || communityId === undefined) return null;
  const amount = `${formatAmount(row.amount_minor)} ${row.currency}`;
  const ids = { communityId, incomeId: row.id };

  if (!row.can_approve) {
    if (!can('finance.income.approve')) return null;
    return row.recorded_by.membership_id === membership?.id ? (
      <p className="details__note">You recorded this, so someone else has to approve it.</p>
    ) : null;
  }

  return (
    <div className="review-actions">
      <Button
        inline
        icon={<IconCheckCircle />}
        disabled={approve.isPending}
        onClick={() =>
          approve.mutate(ids, {
            onSuccess: () =>
              onDone(`${row.title} (${amount}) approved. It now counts in the wallet.`),
          })
        }
      >
        {approve.isPending ? 'Approving…' : 'Approve'}
      </Button>
      <Button variant="secondary" inline icon={<IconBan />} onClick={() => setRejecting(true)}>
        Reject
      </Button>
      {approve.error && (
        <p className="table__warn" role="alert">
          {errorMessage(approve.error)}
        </p>
      )}
      <ReasonPrompt
        open={rejecting}
        title="Reject income"
        subtitle="It never counts. The reason stays on the record."
        icon={<IconBan />}
        about={`${row.title} · ${amount}`}
        placeholder="e.g. The money never arrived, or the amount is wrong."
        confirmLabel="Reject income"
        busy={reject.isPending}
        onClose={() => setRejecting(false)}
        onSubmit={(reason) =>
          reject.mutateAsync({ ...ids, reason }).then(() => {
            setRejecting(false);
            onDone(`${row.title} (${amount}) rejected.`);
          })
        }
      />
    </div>
  );
}
