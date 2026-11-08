import { useState } from 'react';
import type { ReactNode } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconDownload,
  IconHistory,
  Input,
  LoadingState,
  PageHeader,
  SegmentedControl,
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/date';

import { useCashFlowItems } from '../api/cashflow';
import { downloadStatementPdf, downloadTransactionsCsv, useReport } from '../api/reports';
import { formatAmount } from '../format';
import { humanize } from '../labels';
import { THIS_MONTH, monthName } from '../month';
import { MAX_MONTHS, PRESET_LABEL, lastDay, monthsBetween, presetPeriod } from '../period';
import type { Period, PeriodPreset } from '../period';
import { Pager } from './ReasonPrompt';

type View = 'statement' | 'monthly' | 'transactions';

const VIEWS: { value: View; label: string }[] = [
  { value: 'statement', label: 'Statement' },
  { value: 'monthly', label: 'Month by month' },
  { value: 'transactions', label: 'Transactions' },
];

const PRESETS: PeriodPreset[] = [
  'this_month',
  'last_month',
  'this_quarter',
  'this_year',
  'last_year',
  'custom',
];

/** Money as an accountant writes it: outflows and decreases in brackets. */
function amount(minor: number): string {
  if (minor === 0) return '0';
  return minor < 0 ? `(${formatAmount(-minor)})` : formatAmount(minor);
}

function periodText(period: Period): string {
  return period.from === period.to
    ? monthName(period.from)
    : `${monthName(period.from)} to ${monthName(period.to)}`;
}

/**
 * The community's cash flow statement, as a business would draw one up for a
 * period: opening cash, cash in by source, cash out by category, the net
 * change and the closing cash. Built from the backend's finance reports, so
 * it always agrees with the cash flow and the dashboard balance. Every member
 * reads it.
 */
export function CashFlowStatement() {
  const { communityId, membership } = useWorkspace();
  const [preset, setPreset] = useState<PeriodPreset>('this_year');
  const [custom, setCustom] = useState<Period>(presetPeriod('this_year'));
  const [view, setView] = useState<View>('statement');
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);

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
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Cash Flow Statement"
        subtitle="Cash the community had at the start, what came in, what went out, and what is left."
        actions={
          <>
            <Button
              variant="secondary"
              inline
              icon={<IconDownload />}
              disabled={busy !== null || periodError !== null}
              onClick={() => void download('csv')}
            >
              {busy === 'csv' ? 'Preparing…' : 'Transactions (CSV)'}
            </Button>
            <Button
              inline
              icon={<IconDownload />}
              disabled={busy !== null || periodError !== null}
              onClick={() => void download('pdf')}
            >
              {busy === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </Button>
          </>
        }
      />

      <div className="toolbar card statement-period">
        <Select
          label="Period"
          value={preset}
          onChange={(event) => setPreset(event.target.value as PeriodPreset)}
          options={PRESETS.map((p) => ({ value: p, label: PRESET_LABEL[p] }))}
        />
        {preset === 'custom' && (
          <>
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
          </>
        )}
        <p className="statement-period__text">
          <strong>{periodText(period)}</strong>
          <span className="table__muted">
            {span} month{span === 1 ? '' : 's'}
          </span>
        </p>
      </div>

      {periodError && <p className="form-error">{periodError}</p>}
      {downloadError && (
        <p className="table__warn" role="alert">
          {downloadError}
        </p>
      )}

      <SegmentedControl label="View" options={VIEWS} value={view} onChange={setView} />

      {periodError === null && communityId && (
        <>
          {view === 'statement' && (
            <Statement
              communityId={communityId}
              communityName={membership?.community.name ?? 'The community'}
              period={period}
            />
          )}
          {view === 'monthly' && <MonthByMonth communityId={communityId} period={period} />}
          {view === 'transactions' && (
            <Transactions
              key={`${period.from}-${period.to}`}
              communityId={communityId}
              period={period}
            />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The statement
// ---------------------------------------------------------------------------

function Statement({
  communityId,
  communityName,
  period,
}: {
  communityId: string;
  communityName: string;
  period: Period;
}) {
  const summary = useReport(communityId, 'summary', period.from, period.to);
  const contributions = useReport(communityId, 'contributions', period.from, period.to);
  const income = useReport(communityId, 'income', period.from, period.to);
  const expenses = useReport(communityId, 'expenses', period.from, period.to);

  const failed = [summary, contributions, income, expenses].find((q) => q.error);
  if (failed) return <ErrorState message={errorMessage(failed.error)} />;
  if (!summary.data || !contributions.data || !income.data || !expenses.data) {
    return <LoadingState label="Drawing up the statement…" />;
  }

  const s = summary.data;
  const currency = s.currency;
  const contributionRows = contributions.data.by_type.filter((row) => row.amount_minor > 0);
  const incomeRows = income.data.by_source.filter((row) => row.amount_minor > 0);
  const expenseRows = expenses.data.by_category.filter((row) => row.amount_minor > 0);
  const net = s.totals.net_minor;

  return (
    <article className="card statement" aria-labelledby="statement-title">
      <header className="statement__head">
        <p className="statement__org">{communityName}</p>
        <h2 id="statement-title" className="statement__title">
          Cash Flow Statement
        </h2>
        <p className="table__muted">
          For the period {formatLongDate(`${period.from}-01`)} to{' '}
          {formatLongDate(lastDay(period.to))} · Amounts in {currency}
        </p>
      </header>

      <table className="statement__table">
        <tbody>
          <Line label="Cash at the start of the period" value={s.opening_balance_minor} strong />

          <Heading>Cash coming in</Heading>
          <SubHeading>Member contributions</SubHeading>
          {contributionRows.length === 0 ? (
            <Line label="None" value={0} indent={2} muted />
          ) : (
            contributionRows.map((row) => (
              <Line
                key={row.key}
                label={row.label}
                note={`${row.count} payment${row.count === 1 ? '' : 's'}`}
                value={row.amount_minor}
                indent={2}
              />
            ))
          )}
          <Line
            label="Total contributions"
            value={s.totals.contributions_minor}
            indent={1}
            subtotal
          />

          <SubHeading>Other income</SubHeading>
          {incomeRows.length === 0 ? (
            <Line label="None" value={0} indent={2} muted />
          ) : (
            incomeRows.map((row) => (
              <Line
                key={row.key}
                label={row.label}
                note={`${row.count} record${row.count === 1 ? '' : 's'}`}
                value={row.amount_minor}
                indent={2}
              />
            ))
          )}
          <Line label="Total other income" value={s.totals.income_minor} indent={1} subtotal />
          <Line label="Total cash in" value={s.totals.money_in_minor} strong tone="in" />

          <Heading>Cash going out</Heading>
          <SubHeading>Expenses</SubHeading>
          {expenseRows.length === 0 ? (
            <Line label="None" value={0} indent={2} muted />
          ) : (
            expenseRows.map((row) => (
              <Line
                key={row.label}
                label={humanize(row.label)}
                note={`${row.count} expense${row.count === 1 ? '' : 's'}`}
                value={-row.amount_minor}
                indent={2}
              />
            ))
          )}
          <Line label="Total cash out" value={-s.totals.expenses_minor} strong tone="out" />

          <Line
            label={net >= 0 ? 'Net increase in cash' : 'Net decrease in cash'}
            value={net}
            strong
            rule
          />
          <Line label="Cash at the end of the period" value={s.closing_balance_minor} grand />
        </tbody>
      </table>

      <p className="statement__foot table__muted">
        Counts confirmed contributions, recorded income and approved expenses only. Pending,
        rejected and reversed records are left out. Amounts in brackets are money going out.
      </p>
    </article>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <tr className="statement__heading">
      <th scope="rowgroup" colSpan={2}>
        {children}
      </th>
    </tr>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <tr className="statement__subheading">
      <th scope="row" colSpan={2}>
        {children}
      </th>
    </tr>
  );
}

function Line({
  label,
  value,
  note,
  indent = 0,
  strong = false,
  subtotal = false,
  grand = false,
  rule = false,
  muted = false,
  tone,
}: {
  label: string;
  value: number;
  note?: string;
  indent?: 0 | 1 | 2;
  strong?: boolean;
  subtotal?: boolean;
  grand?: boolean;
  rule?: boolean;
  muted?: boolean;
  tone?: 'in' | 'out';
}) {
  const classes = [
    'statement__line',
    `statement__line--indent-${indent}`,
    strong ? 'statement__line--strong' : null,
    subtotal ? 'statement__line--subtotal' : null,
    grand ? 'statement__line--grand' : null,
    rule ? 'statement__line--rule' : null,
    muted ? 'statement__line--muted' : null,
    tone ? `statement__line--${tone}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <tr className={classes}>
      <td>
        {label}
        {note && <span className="statement__note"> · {note}</span>}
      </td>
      <td className="statement__amount">{muted ? '—' : amount(value)}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Month by month
// ---------------------------------------------------------------------------

function MonthByMonth({ communityId, period }: { communityId: string; period: Period }) {
  const summary = useReport(communityId, 'summary', period.from, period.to);
  if (summary.error) return <ErrorState message={errorMessage(summary.error)} />;
  if (!summary.data) return <LoadingState />;
  const s = summary.data;

  return (
    <section className="card table-card" aria-label="Cash flow month by month">
      <div className="table-scroll">
        <table className="table table--compact statement-months">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Contributions</th>
              <th scope="col">Other income</th>
              <th scope="col">Expenses</th>
              <th scope="col">Net</th>
              <th scope="col">Cash at month end</th>
            </tr>
          </thead>
          <tbody>
            <tr className="statement-months__opening">
              <td colSpan={5}>Cash at the start</td>
              <td>{amount(s.opening_balance_minor)}</td>
            </tr>
            {s.monthly.map((m) => (
              <tr key={m.month}>
                <td>{monthName(m.month)}</td>
                <td>{m.contributions_minor ? formatAmount(m.contributions_minor) : '—'}</td>
                <td>{m.income_minor ? formatAmount(m.income_minor) : '—'}</td>
                <td>{m.expenses_minor ? amount(-m.expenses_minor) : '—'}</td>
                <td className={m.net_minor < 0 ? 'cash-box__out' : undefined}>
                  {amount(m.net_minor)}
                </td>
                <td className="table__amount">{amount(m.running_balance_minor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td>{formatAmount(s.totals.contributions_minor)}</td>
              <td>{formatAmount(s.totals.income_minor)}</td>
              <td>{amount(-s.totals.expenses_minor)}</td>
              <td>{amount(s.totals.net_minor)}</td>
              <td className="table__amount">{amount(s.closing_balance_minor)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

const TX_PAGE = 20;

function Transactions({ communityId, period }: { communityId: string; period: Period }) {
  const [page, setPage] = useState(1);
  const items = useCashFlowItems(communityId, {
    from_date: `${period.from}-01`,
    to_date: lastDay(period.to),
    page,
    page_size: TX_PAGE,
  });
  if (items.error) return <ErrorState message={errorMessage(items.error)} />;
  if (!items.data) return <LoadingState />;
  const { summary } = items.data;

  return (
    <section className="card table-card" aria-label="Transactions in the period">
      <header className="table-card__head">
        <p className="section-head__subtitle">
          {summary.in_count} in ({formatAmount(summary.money_in_minor)} {summary.currency}) ·{' '}
          {summary.out_count} out ({formatAmount(summary.money_out_minor)} {summary.currency})
        </p>
      </header>
      {items.data.items.length === 0 ? (
        <EmptyState
          icon={<IconHistory />}
          title="No money moved in this period"
          message="Confirmed contributions, recorded income and approved expenses show here."
        />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">What</th>
                <th scope="col">Who</th>
                <th scope="col">In</th>
                <th scope="col">Out</th>
              </tr>
            </thead>
            <tbody>
              {items.data.items.map((item) => (
                <tr key={`${item.source.type}-${item.source.id}`}>
                  <td>{formatLongDate(item.date)}</td>
                  <td>
                    <span className="table__stack">
                      <span>{item.narrative}</span>
                      <span>
                        <Badge tone={item.direction === 'in' ? 'success' : 'warning'}>
                          {humanize(item.source.type)}
                        </Badge>
                      </span>
                    </span>
                  </td>
                  <td>{item.party ?? '—'}</td>
                  <td className="cash-box__in">
                    {item.direction === 'in' ? formatAmount(item.amount_minor) : ''}
                  </td>
                  <td className="cash-box__out">
                    {item.direction === 'out' ? `(${formatAmount(item.amount_minor)})` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="table-footer">
        <p className="table-footer__summary">
          Showing <strong>{items.data.items.length}</strong> of <strong>{items.data.total}</strong>{' '}
          records
        </p>
        <Pager
          page={page}
          pageCount={Math.max(1, Math.ceil(items.data.total / TX_PAGE))}
          onChange={setPage}
        />
      </footer>
    </section>
  );
}
