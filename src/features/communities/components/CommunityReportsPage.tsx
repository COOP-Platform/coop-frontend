import { useState } from 'react';

import {
  Button,
  EmptyState,
  ErrorState,
  IconDownload,
  IconLock,
  IconMail,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  LoadingState,
  PageHeader,
  SectionCard,
  Select,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { downloadCsv } from '@/lib/csv';

import { MIN_REPORT_YEAR, useMembersReport } from '../api/reports';
import type { MembersReport } from '../api/reports';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Community app, Reports: members now, who joined and who left in a year,
 * members by category, and the member list as a CSV download. Every member reads
 * it (member.view); invitation figures only for those who may invite.
 */
export function CommunityReportsPage() {
  const { communityId, can } = useWorkspace();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const report = useMembersReport(communityId, year);

  const years: number[] = [];
  for (let y = thisYear; y >= MIN_REPORT_YEAR; y -= 1) years.push(y);

  if (!can('member.view')) {
    return (
      <div className="page">
        <PageHeader title="Reports" />
        <EmptyState icon={<IconLock />} title="You cannot see community reports" />
      </div>
    );
  }

  const data = report.data;

  return (
    <div className="page">
      <PageHeader
        title="Reports"
        actions={
          <>
            <Select
              label="Year"
              labelHidden
              value={String(year)}
              onChange={(event) => setYear(Number(event.target.value))}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />
            <Button
              variant="secondary"
              inline
              icon={<IconDownload />}
              disabled={!data || data.roster.length === 0}
              onClick={() => data && downloadRoster(data)}
            >
              Members CSV
            </Button>
          </>
        }
      />

      {report.isPending ? (
        <LoadingState label="Loading the report…" />
      ) : report.error ? (
        <section className="card">
          <ErrorState title="Couldn't load the report" message={errorMessage(report.error)} />
        </section>
      ) : (
        <ReportBody data={report.data} />
      )}
    </div>
  );
}

function ReportBody({ data }: { data: MembersReport }) {
  const invites = data.invitations;
  return (
    <>
      <div className="stat-grid">
        <StatCard
          label="Members"
          value={data.members.total}
          caption={
            data.members.suspended > 0 ? `${data.members.suspended} suspended` : 'All active'
          }
          icon={<IconUsers />}
          tone="brand"
        />
        <StatCard
          label="Joined"
          value={data.joined}
          caption={`In ${data.year}`}
          icon={<IconUserPlus />}
          tone="info"
        />
        <StatCard
          label="Left"
          value={data.left}
          caption={`In ${data.year}`}
          icon={<IconUserMinus />}
          tone="warning"
        />
        {invites ? (
          <StatCard
            label="Invitations"
            value={
              invites.pending +
              invites.accepted +
              invites.expired +
              invites.revoked +
              invites.rejected
            }
            caption={`${invites.pending} pending`}
            icon={<IconMail />}
            tone="accent"
          />
        ) : (
          <StatCard
            label="Categories"
            value={data.by_category.length}
            caption="Of active members"
            icon={<IconUsers />}
            tone="accent"
          />
        )}
      </div>

      <div className="statement-grid">
        <SectionCard
          title="Joined and left"
          actions={
            <p className="chart-legend">
              <span>
                <span className="legend-swatch legend-swatch--in" aria-hidden="true" /> Joined
              </span>
              <span>
                <span className="legend-swatch legend-swatch--out" aria-hidden="true" /> Left
              </span>
            </p>
          }
        >
          {data.joined + data.left === 0 ? (
            <p className="table__muted">Nobody joined or left in {data.year}.</p>
          ) : (
            <JoinedLeftBars months={data.months} />
          )}
        </SectionCard>

        <SectionCard title="By category">
          {data.by_category.length === 0 ? (
            <p className="table__muted">No active members.</p>
          ) : (
            <CategoryList rows={data.by_category} total={data.members.active} />
          )}
        </SectionCard>
      </div>
    </>
  );
}

function CategoryList({ rows, total }: { rows: MembersReport['by_category']; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.members));
  return (
    <ul className="category-bars" role="list">
      {rows.map((row) => (
        <li key={row.id ?? 'none'} className="category-bars__row">
          <div className="category-bars__head">
            <span className="category-bars__label">{row.name}</span>
            <span className="category-bars__value">
              {row.members}
              <span className="table__muted">
                {' '}
                · {total > 0 ? Math.round((row.members / total) * 100) : 0}%
              </span>
            </span>
          </div>
          <div className="category-bars__track" aria-hidden="true">
            <div
              className="category-bars__fill category-bars__fill--in"
              style={{ width: `${(row.members / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function downloadRoster(data: MembersReport) {
  downloadCsv(
    `members-${data.year}.csv`,
    ['Name', 'Category', 'Positions', 'Joined', 'Status'],
    data.roster.map((m) => [
      m.full_name,
      m.category ?? '',
      m.positions.join('; '),
      m.join_date ?? '',
      m.status,
    ]),
  );
}

const W = 640;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 32 };

/** Joined and left, side by side for each month: whole people, so whole ticks. */
function JoinedLeftBars({ months }: { months: MembersReport['months'] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...months.flatMap((m) => [m.joined, m.left]));
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * Math.ceil(max / step);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / months.length;
  const barW = Math.min(20, (band * 0.6) / 2);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  const shown = active === null ? null : months[active];

  return (
    <div className="flow-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Members who joined and left, by month"
        className="flow-chart__svg"
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? 'flow-chart__baseline' : 'flow-chart__grid'}
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              className="flow-chart__tick"
              textAnchor="end"
              dy="0.32em"
            >
              {t}
            </text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = PAD.left + band * i + band / 2;
          return (
            <g
              key={m.month}
              className={active === i ? 'flow-chart__group is-active' : 'flow-chart__group'}
              tabIndex={0}
              aria-label={`${MONTHS[m.month - 1]}: ${m.joined} joined, ${m.left} left`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <rect
                x={cx - band / 2}
                y={PAD.top}
                width={band}
                height={plotH}
                className="flow-chart__hit"
              />
              <Bar x={cx - barW - 1} width={barW} top={y(m.joined)} base={y(0)} kind="in" />
              <Bar x={cx + 1} width={barW} top={y(m.left)} base={y(0)} kind="out" />
              <text x={cx} y={H - 8} className="flow-chart__label" textAnchor="middle">
                {MONTHS[m.month - 1]}
              </text>
            </g>
          );
        })}
      </svg>
      {shown && active !== null && (
        <div
          className="flow-chart__tooltip"
          style={{
            left: `${Math.min(80, Math.max(20, ((PAD.left + band * active + band / 2) / W) * 100))}%`,
          }}
          role="status"
        >
          <p className="flow-chart__tooltip-title">{MONTHS[shown.month - 1]}</p>
          <p>
            <span className="legend-swatch legend-swatch--in" aria-hidden="true" /> Joined{' '}
            <strong>{shown.joined}</strong>
          </p>
          <p>
            <span className="legend-swatch legend-swatch--out" aria-hidden="true" /> Left{' '}
            <strong>{shown.left}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

/** A bar with a rounded data end and a square base on the axis. */
function Bar({
  x,
  width,
  top,
  base,
  kind,
}: {
  x: number;
  width: number;
  top: number;
  base: number;
  kind: 'in' | 'out';
}) {
  const h = Math.max(0, base - top);
  if (h === 0) return null;
  const r = Math.min(4, h, width / 2);
  const d = `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + width - r} Q${x + width},${top} ${x + width},${top + r} V${base} Z`;
  return <path d={d} className={`flow-chart__bar flow-chart__bar--${kind}`} />;
}
