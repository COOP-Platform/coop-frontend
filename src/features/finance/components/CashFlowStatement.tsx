import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconArrowRight,
  IconBarChart,
  IconCheckCircle,
  IconDownload,
  IconFile,
  IconHistory,
  IconInstitution,
  IconSearch,
  Input,
  LoadingState,
  SegmentedControl,
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { useAllCashFlowItems } from '../api/cashflow';
import { downloadStatementPdf, downloadTransactionsCsv, useReport } from '../api/reports';
import type { SummaryReport } from '../api/reports';
import type { CashFlowItem } from '../api/summary';
import { formatAmount } from '../format';
import { humanize } from '../labels';
import { THIS_MONTH, monthName } from '../month';
import {
  MAX_MONTHS,
  PRESET_LABEL,
  lastDay,
  monthsBetween,
  presetPeriod,
  previousPeriod,
} from '../period';
import type { Period, PeriodPreset } from '../period';
import { Pager } from './ReasonPrompt';
import { CashFlowBars, CategoryBars } from './StatementCharts';
import { SectionHeader } from './SectionHeader';

const PRESETS: PeriodPreset[] = [
  'this_month',
  'last_3',
  'last_6',
  'this_year',
  'last_year',
  'custom',
];
const ROWS_PER_PAGE = 10;
const ALL = '';

/**
 * The community's cash flow statement for a period: opening balance, cash in,
 * cash out and closing balance (each against the previous period), money in
 * and out by month, by category, and every transaction with its running
 * balance. Built from the backend's finance reports and cash flow, so every
 * figure agrees with the dashboard. Every member reads it.
 */
export function CashFlowStatement({ embedded = false }: { embedded?: boolean }) {
  const { communityId } = useWorkspace();
  const [preset, setPreset] = useState<PeriodPreset>('last_6');
  const [custom, setCustom] = useState<Period>(presetPeriod('last_6'));
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const period = preset === 'custom' ? custom : presetPeriod(preset);
  const span = monthsBetween(period.from, period.to);
  const periodError =
    span < 1
      ? 'The first month must not be after the last.'
      : span > MAX_MONTHS
        ? `A statement covers at most ${MAX_MONTHS} months.`
        : null;

  async function download(kind: 'pdf' | 'csv') {
    if (!communityId) return;
    setDownloadError(null);
    setBusy(kind);
    try {
      if (kind === 'pdf') await downloadStatementPdf(communityId, period.from, period.to);
      else await downloadTransactionsCsv(communityId, `${period.from}-01`, lastDay(period.to));
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <SectionHeader
        embedded={embedded}
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Cash Flow Statement"
        subtitle="Track the community's cash: what it started with, what came in, what went out and what is left."
        actions={
          <>
            <Select
              label="Period"
              value={preset}
              onChange={(event) => setPreset(event.target.value as PeriodPreset)}
              options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
            />
            <Button
              variant="secondary"
              inline
              icon={<IconFile />}
              disabled={busy !== null || periodError !== null}
              onClick={() => void download('pdf')}
            >
              {busy === 'pdf' ? 'Preparing…' : 'Export PDF'}
            </Button>
            <Button
              inline
              icon={<IconDownload />}
              disabled={busy !== null || periodError !== null}
              onClick={() => void download('csv')}
            >
              {busy === 'csv' ? 'Preparing…' : 'Export Excel (CSV)'}
            </Button>
          </>
        }
      />

      {preset === 'custom' && (
        <div className="toolbar card statement-period">
          <Input
            label="From"
            type="month"
            value={custom.from}
            max={THIS_MONTH}
            onChange={(event) =>
              event.target.value && setCustom({ ...custom, from: event.target.value })
            }
          />
          <Input
            label="To"
            type="month"
            value={custom.to}
            max={THIS_MONTH}
            onChange={(event) =>
              event.target.value && setCustom({ ...custom, to: event.target.value })
            }
          />
        </div>
      )}

      {periodError && <p className="form-error">{periodError}</p>}
      {downloadError && (
        <p className="table__warn" role="alert">
          {downloadError}
        </p>
      )}

      {periodError === null && communityId && (
        <StatementBody
          key={`${period.from}-${period.to}`}
          communityId={communityId}
          period={period}
        />
      )}
    </div>
  );
}

function StatementBody({ communityId, period }: { communityId: string; period: Period }) {
  const before = previousPeriod(period);
  const summary = useReport(communityId, 'summary', period.from, period.to);
  const previous = useReport(communityId, 'summary', before.from, before.to);
  const contributions = useReport(communityId, 'contributions', period.from, period.to);
  const income = useReport(communityId, 'income', period.from, period.to);
  const expenses = useReport(communityId, 'expenses', period.from, period.to);
  const items = useAllCashFlowItems(communityId, `${period.from}-01`, lastDay(period.to));

  const failed = [summary, contributions, income, expenses, items].find((q) => q.error);
  if (failed) return <ErrorState message={errorMessage(failed.error)} />;
  if (!summary.data || !contributions.data || !income.data || !expenses.data || !items.data) {
    return <LoadingState label="Drawing up the statement…" />;
  }

  const s = summary.data;
  const currency = s.currency;
  const inRows = [
    ...contributions.data.by_type.map((r) => ({ ...r, label: `${r.label} contributions` })),
    ...income.data.by_source,
  ]
    .filter((r) => r.amount_minor > 0)
    .sort((a, b) => b.amount_minor - a.amount_minor);
  const outRows = expenses.data.by_category
    .filter((r) => r.amount_minor > 0)
    .map((r) => ({ ...r, label: humanize(r.label) }));

  return (
    <>
      <KpiCards summary={s} previous={previous.data} />

      <div className="statement-grid">
        <section className="card statement-panel" aria-labelledby="overview-title">
          <header className="statement-panel__head">
            <h2 id="overview-title" className="section-head__title">
              <IconBarChart width={20} height={20} aria-hidden="true" /> Cash flow overview
            </h2>
            <p className="chart-legend">
              <span>
                <span className="legend-swatch legend-swatch--in" aria-hidden="true" /> Money in
              </span>
              <span>
                <span className="legend-swatch legend-swatch--out" aria-hidden="true" /> Money out
              </span>
            </p>
          </header>
          <CashFlowBars
            months={s.monthly.map((m) => ({
              month: m.month,
              in_minor: m.contributions_minor + m.income_minor,
              out_minor: m.expenses_minor,
            }))}
          />
        </section>

        <CategoryPanel inRows={inRows} outRows={outRows} currency={currency} />
      </div>

      <TransactionTable items={items.data} closing={s.closing_balance_minor} currency={currency} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------

function KpiCards({ summary, previous }: { summary: SummaryReport; previous?: SummaryReport }) {
  const currency = summary.currency;
  return (
    <div className="kpi-grid">
      <Kpi
        tone="info"
        icon={<IconInstitution />}
        label="Opening balance"
        minor={summary.opening_balance_minor}
        currency={currency}
        note={`At the start of ${monthName(summary.period.from.slice(0, 7))}`}
      />
      <Kpi
        tone="in"
        icon={<IconArrowRight className="kpi__arrow-in" />}
        label="Total cash in"
        minor={summary.totals.money_in_minor}
        currency={currency}
        change={change(summary.totals.money_in_minor, previous?.totals.money_in_minor)}
      />
      <Kpi
        tone="out"
        icon={<IconArrowRight className="kpi__arrow-out" />}
        label="Total cash out"
        minor={summary.totals.expenses_minor}
        currency={currency}
        change={change(summary.totals.expenses_minor, previous?.totals.expenses_minor)}
      />
      <Kpi
        tone="brand"
        icon={<IconCheckCircle />}
        label="Closing balance"
        minor={summary.closing_balance_minor}
        currency={currency}
        change={change(summary.closing_balance_minor, previous?.closing_balance_minor)}
      />
    </div>
  );
}

/** Percent change against the previous period; null when there is nothing to compare. */
function change(now: number, before: number | undefined): number | null {
  if (before === undefined || before === 0) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

function Kpi({
  tone,
  icon,
  label,
  minor,
  currency,
  change: delta,
  note,
}: {
  tone: 'info' | 'in' | 'out' | 'brand';
  icon: ReactNode;
  label: string;
  minor: number;
  currency: string;
  change?: number | null;
  note?: string;
}) {
  return (
    <section className={`card kpi kpi--${tone}`} aria-label={label}>
      <span className="kpi__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="kpi__body">
        <p className="kpi__label">{label}</p>
        <p className="kpi__value">
          {currency} {formatAmount(minor)}
        </p>
        <p className="kpi__note">
          {note ??
            (delta === null || delta === undefined
              ? 'Nothing to compare with before'
              : `${delta >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(delta))}% vs previous period`)}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// By category
// ---------------------------------------------------------------------------

function CategoryPanel({
  inRows,
  outRows,
  currency,
}: {
  inRows: { label: string; amount_minor: number; count: number }[];
  outRows: { label: string; amount_minor: number; count: number }[];
  currency: string;
}) {
  const [side, setSide] = useState<'in' | 'out'>('in');
  return (
    <section className="card statement-panel" aria-labelledby="category-title">
      <header className="statement-panel__head">
        <h2 id="category-title" className="section-head__title">
          Cash flow by category
        </h2>
        <SegmentedControl
          label="Money in or out"
          options={[
            { value: 'in', label: 'Money in' },
            { value: 'out', label: 'Money out' },
          ]}
          value={side}
          onChange={setSide}
        />
      </header>
      <CategoryBars rows={side === 'in' ? inRows : outRows} kind={side} currency={currency} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// The statement table
// ---------------------------------------------------------------------------

const PREFIX: Record<CashFlowItem['source']['type'], string> = {
  contribution: 'CON',
  income: 'INC',
  expense: 'EXP',
};

function reference(item: CashFlowItem): string {
  return (
    item.payment_reference ??
    `${PREFIX[item.source.type]}-${item.source.id.slice(0, 6).toUpperCase()}`
  );
}

function categoryOf(item: CashFlowItem): string {
  if (!item.category) return humanize(item.source.type);
  const name = humanize(item.category);
  return item.source.type === 'contribution' ? `${name} contribution` : name;
}

function TransactionTable({
  items,
  closing,
  currency,
}: {
  items: CashFlowItem[];
  closing: number;
  currency: string;
}) {
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [method, setMethod] = useState(ALL);
  const [page, setPage] = useState(1);

  // Newest first: the newest row's balance is the closing balance, and each
  // older row's is the one after it less what that later row moved.
  const withBalance = useMemo(() => {
    let balance = closing;
    return items.map((item) => {
      const row = { item, balance };
      balance -= item.direction === 'in' ? item.amount_minor : -item.amount_minor;
      return row;
    });
  }, [items, closing]);

  const categories = [...new Set(items.map(categoryOf))].sort();
  const methods = [
    ...new Set(items.map((i) => i.payment_method).filter((m): m is string => !!m)),
  ].sort();
  const needle = search.trim().toLowerCase();
  const filtered = withBalance.filter(({ item }) => {
    if (category !== ALL && categoryOf(item) !== category) return false;
    if (method !== ALL && item.payment_method !== method) return false;
    if (!needle) return true;
    return [item.narrative, item.party, reference(item), categoryOf(item)].some(
      (text) => text !== null && text.toLowerCase().includes(needle),
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * ROWS_PER_PAGE, current * ROWS_PER_PAGE);

  return (
    <section className="card table-card" aria-labelledby="statement-table-title">
      <header className="statement-table__head">
        <h2 id="statement-table-title" className="section-head__title">
          Cash flow statement
        </h2>
        <p className="table__muted statement-table__unit">Amounts in {currency}</p>
        <div className="statement-table__filters">
          <div className="search-field">
            <label htmlFor={searchId} className="visually-hidden">
              Search transactions
            </label>
            <span className="search-field__icon" aria-hidden="true">
              <IconSearch />
            </span>
            <input
              id={searchId}
              type="search"
              className="search-field__input"
              placeholder="Search transactions..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            label="Category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            options={[
              { value: ALL, label: 'All categories' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            label="Payment method"
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);
              setPage(1);
            }}
            options={[
              { value: ALL, label: 'All payment methods' },
              ...methods.map((m) => ({ value: m, label: humanize(m) })),
            ]}
          />
        </div>
      </header>

      {visible.length === 0 ? (
        <EmptyState
          icon={<IconHistory />}
          title={
            items.length === 0 ? 'No money moved in this period' : 'Nothing matches these filters'
          }
          message="Confirmed contributions, recorded income and approved expenses show here."
        />
      ) : (
        <div className="table-scroll">
          <table className="table statement-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Reference</th>
                <th scope="col">Description</th>
                <th scope="col">Category</th>
                <th scope="col" className="statement-table__num">
                  Cash in
                </th>
                <th scope="col" className="statement-table__num">
                  Cash out
                </th>
                <th scope="col" className="statement-table__num">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ item, balance }) => (
                <tr key={`${item.source.type}-${item.source.id}`}>
                  <td className="statement-table__date">{formatDate(item.date)}</td>
                  <td className="mono">{reference(item)}</td>
                  <td>
                    <span className="table__stack">
                      <span>{item.party ?? item.narrative}</span>
                      {item.party && <span className="table__muted">{item.narrative}</span>}
                    </span>
                  </td>
                  <td>
                    <Badge tone={item.direction === 'in' ? 'info' : 'warning'}>
                      {categoryOf(item)}
                    </Badge>
                  </td>
                  <td className="statement-table__num cash-box__in">
                    {item.direction === 'in' ? formatAmount(item.amount_minor) : '—'}
                  </td>
                  <td className="statement-table__num cash-box__out">
                    {item.direction === 'out' ? formatAmount(item.amount_minor) : '—'}
                  </td>
                  <td className="statement-table__num table__amount">{formatAmount(balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="table-footer">
        <p className="table-footer__summary">
          Showing{' '}
          <strong>
            {filtered.length === 0 ? 0 : (current - 1) * ROWS_PER_PAGE + 1}–
            {(current - 1) * ROWS_PER_PAGE + visible.length}
          </strong>{' '}
          of <strong>{filtered.length}</strong> transactions
        </p>
        <Pager page={current} pageCount={pageCount} onChange={setPage} />
      </footer>
    </section>
  );
}
