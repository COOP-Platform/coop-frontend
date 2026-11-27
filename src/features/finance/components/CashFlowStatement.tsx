import { useId, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconArrowRight,
  IconCheckCircle,
  IconDownload,
  IconHistory,
  IconInstitution,
  IconSearch,
  Input,
  LoadingState,
  SectionCard,
  SegmentedControl,
  Select,
  StatCard,
  TableFooter,
  usePaged,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { useAllCashFlowItems } from '../api/cashflow';
import { downloadStatementPdf, useReport } from '../api/reports';
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
import { Money } from './Money';
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
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const period = preset === 'custom' ? custom : presetPeriod(preset);
  const span = monthsBetween(period.from, period.to);
  const periodError =
    span < 1
      ? 'The first month must not be after the last.'
      : span > MAX_MONTHS
        ? `A statement covers at most ${MAX_MONTHS} months.`
        : null;

  async function download() {
    if (!communityId) return;
    setDownloadError(null);
    setBusy(true);
    try {
      await downloadStatementPdf(communityId, period.from, period.to);
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <SectionHeader
        embedded={embedded}
        title="Cash Flow Statement"
        actions={
          <>
            <Select
              label="Period"
              labelHidden
              value={preset}
              onChange={(event) => setPreset(event.target.value as PeriodPreset)}
              options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
            />
            <Button
              inline
              icon={<IconDownload />}
              disabled={busy || periodError !== null}
              onClick={() => void download()}
            >
              {busy ? 'Preparing…' : 'Download PDF'}
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
        <SectionCard
          title="Money in and out"
          actions={
            <p className="chart-legend">
              <span>
                <span className="legend-swatch legend-swatch--in" aria-hidden="true" /> In
              </span>
              <span>
                <span className="legend-swatch legend-swatch--out" aria-hidden="true" /> Out
              </span>
            </p>
          }
        >
          <CashFlowBars
            months={s.monthly.map((m) => ({
              month: m.month,
              in_minor: m.contributions_minor + m.income_minor,
              out_minor: m.expenses_minor,
            }))}
          />
        </SectionCard>

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
  const monthly = summary.monthly;
  return (
    <div className="stat-grid">
      <StatCard
        label="Opening balance"
        value={<Money minor={summary.opening_balance_minor} currency={currency} />}
        caption={`Start of ${monthName(summary.period.from.slice(0, 7))}`}
        icon={<IconInstitution />}
        tone="accent"
      />
      <StatCard
        label="Cash in"
        value={<Money minor={summary.totals.money_in_minor} currency={currency} />}
        caption={
          <Change
            delta={change(summary.totals.money_in_minor, previous?.totals.money_in_minor)}
            goodWhenUp
          />
        }
        icon={<IconArrowRight className="kpi__arrow-in" />}
        tone="info"
        trend={monthly.map((m) => m.contributions_minor + m.income_minor)}
      />
      <StatCard
        label="Cash out"
        value={<Money minor={summary.totals.expenses_minor} currency={currency} />}
        caption={
          <Change delta={change(summary.totals.expenses_minor, previous?.totals.expenses_minor)} />
        }
        icon={<IconArrowRight className="kpi__arrow-out" />}
        tone="warning"
        trend={monthly.map((m) => m.expenses_minor)}
      />
      <StatCard
        label="Closing balance"
        value={<Money minor={summary.closing_balance_minor} currency={currency} />}
        caption={
          <Change
            delta={change(summary.closing_balance_minor, previous?.closing_balance_minor)}
            goodWhenUp
          />
        }
        icon={<IconCheckCircle />}
        tone="brand"
        trend={monthly.map((m) => m.running_balance_minor)}
      />
    </div>
  );
}

/** Percent change against the previous period; null when there is nothing to compare. */
function change(now: number, before: number | undefined): number | null {
  if (before === undefined || before === 0) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

/** "↑ 12% vs last period": green when the move is good, orange when it is not. */
function Change({ delta, goodWhenUp = false }: { delta: number | null; goodWhenUp?: boolean }) {
  if (delta === null) return <>No earlier period</>;
  const up = delta >= 0;
  return (
    <>
      <b className={up === goodWhenUp ? 'caption-up' : 'caption-warn'}>
        {up ? '↑' : '↓'} {Math.abs(Math.round(delta))}%
      </b>{' '}
      vs last period
    </>
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
    <SectionCard
      title="By category"
      actions={
        <SegmentedControl
          label="Money in or out"
          options={[
            { value: 'in', label: 'In' },
            { value: 'out', label: 'Out' },
          ]}
          value={side}
          onChange={setSide}
        />
      }
    >
      <CategoryBars rows={side === 'in' ? inRows : outRows} kind={side} currency={currency} />
    </SectionCard>
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
  const paged = usePaged(filtered);

  return (
    <SectionCard
      title="Transactions"
      actions={
        <>
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
              placeholder="Search…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                paged.setPage(1);
              }}
            />
          </div>
          <Select
            label="Category"
            labelHidden
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              paged.setPage(1);
            }}
            options={[
              { value: ALL, label: 'All categories' },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <Select
            label="Payment method"
            labelHidden
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);
              paged.setPage(1);
            }}
            options={[
              { value: ALL, label: 'All methods' },
              ...methods.map((m) => ({ value: m, label: humanize(m) })),
            ]}
          />
        </>
      }
      flush
      footer={<TableFooter {...paged} onPage={paged.setPage} />}
    >
      {paged.rows.length === 0 ? (
        <EmptyState
          icon={<IconHistory />}
          title={
            items.length === 0 ? 'No money moved in this period' : 'Nothing matches these filters'
          }
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
                <th scope="col" className="num">
                  In ({currency})
                </th>
                <th scope="col" className="num">
                  Out ({currency})
                </th>
                <th scope="col" className="num">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map(({ item, balance }) => (
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
                  <td className="num cash-box__in">
                    {item.direction === 'in' ? formatAmount(item.amount_minor) : '—'}
                  </td>
                  <td className="num cash-box__out">
                    {item.direction === 'out' ? formatAmount(item.amount_minor) : '—'}
                  </td>
                  <td className="num table__amount">{formatAmount(balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
