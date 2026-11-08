import { useState } from 'react';

import { formatAmount } from '../format';
import { monthName } from '../month';

/*
 * The statement's two charts, drawn in plain SVG/HTML (the app has no chart
 * library). Colours are the app's own: success green for money in and the deep accent
 * gold for money out (styles/app.css); identity never rides on colour alone: a legend, direct labels and
 * a hover/focus tooltip carry it too.
 */

/** 1,250,000 RWF -> "1.25M", 450,000 -> "450K". `minor` is in minor units. */
function compact(minor: number): string {
  const major = minor / 100;
  const abs = Math.abs(major);
  if (abs >= 1_000_000) return `${+(major / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${+(major / 1_000).toFixed(1)}K`;
  return String(Math.round(major));
}

/** A round axis top above `max` (1, 2, 2.5, 5 x 10^n), and its tick step. */
function niceScale(max: number): { top: number; step: number } {
  if (max <= 0) return { top: 4, step: 1 };
  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * power).find((s) => s >= rough) ?? 10 * power;
  return { top: step * Math.ceil(max / step), step };
}

export interface MonthFlow {
  month: string;
  in_minor: number;
  out_minor: number;
}

const W = 640;
const H = 260;
const PAD = { top: 12, right: 8, bottom: 28, left: 52 };

/** Money in and money out, side by side for each month. */
export function CashFlowBars({ months }: { months: MonthFlow[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...months.flatMap((m) => [m.in_minor, m.out_minor]));
  const { top, step } = niceScale(max);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / Math.max(1, months.length);
  const barW = Math.min(28, (band * 0.6) / 2);
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const shown = active === null ? null : months[active];

  return (
    <div className="flow-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Money in and money out by month"
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
              {compact(t)}
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
              aria-label={`${monthName(m.month)}: in ${formatAmount(m.in_minor)}, out ${formatAmount(m.out_minor)}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              {/* The hit target is the whole month band, wider than the bars. */}
              <rect
                x={cx - band / 2}
                y={PAD.top}
                width={band}
                height={plotH}
                className="flow-chart__hit"
              />
              <Bar x={cx - barW - 1} width={barW} top={y(m.in_minor)} base={y(0)} kind="in" />
              <Bar x={cx + 1} width={barW} top={y(m.out_minor)} base={y(0)} kind="out" />
              <text x={cx} y={H - 8} className="flow-chart__label" textAnchor="middle">
                {monthName(m.month).slice(0, 3)}
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
          <p className="flow-chart__tooltip-title">{monthName(shown.month)}</p>
          <p>
            <span className="legend-swatch legend-swatch--in" aria-hidden="true" /> In{' '}
            <strong>{formatAmount(shown.in_minor)}</strong>
          </p>
          <p>
            <span className="legend-swatch legend-swatch--out" aria-hidden="true" /> Out{' '}
            <strong>{formatAmount(shown.out_minor)}</strong>
          </p>
          <p className="table__muted">Net {formatAmount(shown.in_minor - shown.out_minor)}</p>
        </div>
      )}
    </div>
  );
}

/** A bar with a 4px rounded data end and a square base on the axis. */
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

export interface CategoryShare {
  label: string;
  amount_minor: number;
  count: number;
}

/** Categories ranked by amount, as bars on one scale (easier to compare than slices). */
export function CategoryBars({
  rows,
  kind,
  currency,
}: {
  rows: CategoryShare[];
  kind: 'in' | 'out';
  currency: string;
}) {
  const total = rows.reduce((sum, r) => sum + r.amount_minor, 0);
  const max = Math.max(0, ...rows.map((r) => r.amount_minor));
  if (rows.length === 0) {
    return (
      <p className="table__muted">
        No money {kind === 'in' ? 'came in' : 'went out'} in this period.
      </p>
    );
  }
  return (
    <ul className="category-bars" role="list">
      {rows.map((row) => {
        const percent = total > 0 ? (row.amount_minor / total) * 100 : 0;
        return (
          <li key={row.label} className="category-bars__row">
            <div className="category-bars__head">
              <span className="category-bars__label">{row.label}</span>
              <span className="category-bars__value">
                {formatAmount(row.amount_minor)} {currency}
                <span className="table__muted"> · {Math.round(percent)}%</span>
              </span>
            </div>
            <div className="category-bars__track" aria-hidden="true">
              <div
                className={`category-bars__fill category-bars__fill--${kind}`}
                style={{ width: `${max > 0 ? (row.amount_minor / max) * 100 : 0}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
