import { useId, useState } from 'react';

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconEye,
  IconHistory,
  IconPiggyBank,
  IconSearch,
  IconWallet,
  IconFile,
  LoadingState,
  SegmentedControl,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import { useIncomeDetail, useIncomeList, useReverseIncome } from '../api/income';
import type { Income, IncomeSource } from '../api/income';
import { formatAmount } from '../format';
import { INCOME_SOURCE, INCOME_STATUS, METHOD_LABEL, NO_METHOD } from '../labels';
import { THIS_MONTH, monthName } from '../month';
import { CashBoxLine } from './CashBox';
import { Money } from './Money';
import { MonthPicker } from './MonthPicker';
import { Pager, ReasonPrompt } from './ReasonPrompt';
import { RecordIncomeDialog } from './RecordIncomeDialog';
import { SuccessNotice } from './SuccessNotice';
import { SectionHeader } from './SectionHeader';

const PAGE_SIZE = 20;

type SourceFilter = 'all' | IncomeSource;
const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'donation', label: 'Donations' },
  { value: 'event_revenue', label: 'Events' },
  { value: 'interest', label: 'Interest' },
  { value: 'other', label: 'Other' },
];

/**
 * Money in that is not a member's contribution (backend S3-35). Counts in the
 * wallet as soon as it is recorded; every member reads it; a mistake is
 * reversed with a reason, never edited or deleted.
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Income | null>(null);
  const [recording, setRecording] = useState(startRecording && canRecord);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useIncomeList(communityId, {
    month,
    source: source === 'all' ? undefined : source,
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
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Income"
        subtitle="Donations, event revenue and interest: money in that is not a member's contribution."
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

      <div className="stat-grid stat-grid--three">
        <StatCard
          label="Income"
          value={<Money minor={summary.total_income_minor} currency={summary.currency} />}
          caption={`Counted in the wallet, ${label}`}
          icon={<IconWallet />}
          tone="brand"
        />
        <StatCard
          label="Entries"
          value={summary.count}
          caption="Recorded and counting"
          icon={<IconFile />}
          tone="info"
        />
        <StatCard
          label="Reversed"
          value={summary.reversed_count}
          caption="Taken back out, kept on record"
          icon={<IconHistory />}
          tone="warning"
        />
      </div>

      <div className="toolbar card">
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
            placeholder="Search title, giver or reference..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="toolbar__controls">
          <SegmentedControl
            label="Filter by source"
            options={SOURCE_OPTIONS}
            value={source}
            onChange={(value) => {
              setSource(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <section className="card table-card" aria-labelledby="income-title">
        <header className="table-card__head">
          <h2 id="income-title" className="section-head__title">
            Income in {label}
          </h2>
          <p className="section-head__subtitle">
            Every member can read these; open one for details.
          </p>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={<IconPiggyBank width={28} height={28} />}
            title={`No income in ${label}`}
            message={
              source === 'all' && !search
                ? 'Donations, event revenue and interest the Treasurer records will show here.'
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
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__action-col">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const badge = INCOME_STATUS[row.status];
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
                        <span className="table__stack">
                          <span className="table__name">{row.title}</span>
                          <span className="table__muted">{INCOME_SOURCE[row.source]}</span>
                        </span>
                      </td>
                      <td>
                        <span className="table__stack">
                          <span>{row.received_from ?? '—'}</span>
                          <span className="table__muted">{method.label}</span>
                        </span>
                      </td>
                      <td>
                        <span className="table__stack">
                          <span className="table__amount">
                            <Money minor={row.amount_minor} currency={row.currency} />
                          </span>
                          <span className="table__muted">{formatDate(row.received_on)}</span>
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
            Showing <strong>{items.length}</strong> of <strong>{total}</strong> entries
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
            `${income.title} (${formatAmount(income.amount_minor)} ${income.currency}) recorded and counted in the wallet.`,
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
      {row.reversal_reason && (
        <p className="details__note" role="note">
          <strong>Reversed:</strong> {row.reversal_reason}
        </p>
      )}

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
            subtitle="It stops counting in every total; the record stays. Record it again if a detail was wrong."
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
