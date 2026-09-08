import { useState } from 'react';

import { Panel } from '@/components/ui';

import type { TrendPoint } from '../data/placeholder';

interface ContributionsTrendProps {
  points: readonly TrendPoint[];
}

/** Four recessive gridlines, matching the design. Values are never labelled. */
const GRIDLINE_COUNT = 4;

/**
 * Headroom above the tallest bar so it doesn't collide with the top gridline.
 * The scale is deliberately not "nice-numbered": with no value axis there is
 * nothing for a rounded maximum to line up against.
 */
const HEADROOM = 1.08;

/** Millions of RWF back to a full amount: 2.45 -> "2,450,000 RWF". */
function formatAmount(millions: number): string {
  return `${Math.round(millions * 1_000_000).toLocaleString('en-US')} RWF`;
}

export function ContributionsTrend({ points }: ContributionsTrendProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Guarded: `Math.max()` of an empty list is -Infinity, and a real endpoint
  // can legitimately return no months yet.
  const max = points.length === 0 ? 1 : Math.max(...points.map((point) => point.value)) * HEADROOM;

  return (
    <Panel
      title="Contributions Trend"
      subtitle="Last 6 months collection trend in RWF"
      action={<span className="panel__badge">RWF (Millions)</span>}
    >
      {/*
        The bars are decoration for assistive tech — the table below carries the
        same numbers, which is both more useful than 6 announced <rect>s and the
        accessible alternative the chart needs. Hover shows values for everyone
        else, so no bar is ever labelled directly.
      */}
      <div className="chart" aria-hidden="true">
        <div className="chart__grid">
          {Array.from({ length: GRIDLINE_COUNT }, (_, line) => (
            <span key={line} className="chart__gridline" />
          ))}
        </div>

        <div className="chart__columns">
          {points.map((point, index) => (
            <div
              key={point.label}
              className="chart__column"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            >
              {hovered === index && (
                <span className="chart__tooltip">{formatAmount(point.value)}</span>
              )}
              <span
                className="chart__bar"
                style={{ height: `${(point.value / max) * 100}%` }}
              />
            </div>
          ))}
        </div>

        <div className="chart__labels">
          {points.map((point) => (
            <span key={point.label} className="chart__label">
              {point.label}
            </span>
          ))}
        </div>
      </div>

      <table className="visually-hidden">
        <caption>Contributions collected per month, last 6 months</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Collected</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{formatAmount(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
