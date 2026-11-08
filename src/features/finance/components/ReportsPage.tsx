import { useState } from 'react';

import {
  Button,
  ErrorState,
  IconDownload,
  IconFile,
  Input,
  LoadingState,
  PageHeader,
  SegmentedControl,
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useReport } from '../api/reports';
import { formatAmount } from '../format';
import { humanize } from '../labels';
import { THIS_MONTH, monthName } from '../month';
import { MAX_MONTHS, PRESET_LABEL, monthsBetween, presetPeriod } from '../period';
import type { Period, PeriodPreset } from '../period';
import { CategoryBars } from './StatementCharts';

type ReportKind = 'contributions' | 'income' | 'expenses';

const KINDS: { value: ReportKind; label: string }[] = [
  { value: 'contributions', label: 'Contributions' },
  { value: 'income', label: 'Income' },
  { value: 'expenses', label: 'Expenses' },
];

const PRESETS: PeriodPreset[] = [
  'this_month',
  'last_3',
  'last_6',
  'this_year',
  'last_year',
  'custom',
];

/**
 * Finance reports (backend S3-11): for a period, contributions by type and by
 * member category, income by source, expenses by category, each with its
 * month-by-month series and a PDF / CSV download. Every member reads them.
 * The summary (opening, in, out, closing) lives on the Cash Flow Statement.
 */
export function ReportsPage() {
  const { communityId } = useWorkspace();
  const [kind, setKind] = useState<ReportKind>('contributions');
  const [preset, setPreset] = useState<PeriodPreset>('this_year');
  const [custom, setCustom] = useState<Period>(presetPeriod('this_year'));
  const [busy, setBusy] = useState<'pdf' | 'csv' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const period = preset === 'custom' ? custom : presetPeriod(preset);
  const span = monthsBetween(period.from, period.to);
  const periodError =
    span < 1
      ? 'The first month must not be after the last.'
      : span > MAX_MONTHS
        ? `A report covers at most ${MAX_MONTHS} months.`
        : null;

  async function download(format: 'pdf' | 'csv') {
    if (!communityId) return;
    setDownloadError(null);
    setBusy(format);
    try {
      await apiDownload(
        `/communities/${communityId}/finance/reports/export/?type=${kind}&from=${period.from}&to=${period.to}&format=${format}`,
        `${kind}-report-${period.from}-to-${period.to}.${format}`,
      );
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
        title="Reports"
        subtitle="Where contributions, income and expenses came from and went, for any period."
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
              {busy === 'pdf' ? 'Preparing…' : 'PDF'}
            </Button>
            <Button
              inline
              icon={<IconDownload />}
              disabled={busy !== null || periodError !== null}
              onClick={() => void download('csv')}
            >
              {busy === 'csv' ? 'Preparing…' : 'Excel (CSV)'}
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

      <SegmentedControl label="Report" options={KINDS} value={kind} onChange={setKind} />

      {periodError === null && communityId && (
        <ReportBody communityId={communityId} kind={kind} period={period} />
      )}
    </div>
  );
}

function ReportBody({
  communityId,
  kind,
  period,
}: {
  communityId: string;
  kind: ReportKind;
  period: Period;
}) {
  const report = useReport(communityId, kind, period.from, period.to);
  if (report.error) return <ErrorState message={errorMessage(report.error)} />;
  if (!report.data) return <LoadingState />;
  const data = report.data;
  const currency = data.currency;
  const tone = kind === 'expenses' ? 'out' : 'in';

  const breakdowns: {
    title: string;
    rows: { label: string; amount_minor: number; count: number }[];
  }[] =
    'by_type' in data
      ? [
          { title: 'By type', rows: data.by_type },
          {
            title: 'By member category',
            rows: data.by_category.map((r) => ({ ...r, label: r.name })),
          },
        ]
      : 'by_source' in data
        ? [{ title: 'By source', rows: data.by_source }]
        : [
            {
              title: 'By category',
              rows: data.by_category.map((r) => ({ ...r, label: humanize(r.label) })),
            },
          ];

  const noun = kind === 'contributions' ? 'payment' : kind === 'income' ? 'record' : 'expense';

  return (
    <div className="money-section">
      <section className={`card kpi kpi--${tone === 'in' ? 'in' : 'out'} report-total`}>
        <div className="kpi__body">
          <p className="kpi__label">
            Total {kind} · {monthName(period.from)}
            {period.from !== period.to && ` to ${monthName(period.to)}`}
          </p>
          <p className="kpi__value">
            {currency} {formatAmount(data.total_minor)}
          </p>
          <p className="kpi__note">
            {data.count} {noun}
            {data.count === 1 ? '' : 's'}
            {kind === 'contributions'
              ? ', confirmed only'
              : kind === 'expenses'
                ? ', approved only'
                : ', reversed ones left out'}
          </p>
        </div>
      </section>

      <div className="statement-grid report-grid">
        {breakdowns.map((b) => (
          <section key={b.title} className="card statement-panel" aria-label={b.title}>
            <h2 className="section-head__title">{b.title}</h2>
            <CategoryBars
              rows={b.rows.filter((r) => r.amount_minor > 0)}
              kind={tone}
              currency={currency}
            />
          </section>
        ))}
      </div>

      <section className="card table-card" aria-label="Month by month">
        <header className="table-card__head">
          <h2 className="section-head__title">Month by month</h2>
        </header>
        <div className="table-scroll">
          <table className="table table--compact statement-months">
            <thead>
              <tr>
                <th scope="col">Month</th>
                <th scope="col">Amount ({currency})</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{monthName(m.month)}</td>
                  <td>{m.amount_minor ? formatAmount(m.amount_minor) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>{formatAmount(data.total_minor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
