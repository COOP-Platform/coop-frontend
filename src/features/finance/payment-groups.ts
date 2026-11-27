import type { Contribution } from './api/my-contributions';
import { periodLabel } from './labels';

/** "September 2022 – February 2023 · 6 months", or the one month. */
export function coversLabel(rows: readonly Contribution[]): string {
  const sorted = [...rows].sort(
    (a, b) => a.period_year - b.period_year || (a.period_month ?? 0) - (b.period_month ?? 0),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return '';
  if (sorted.length === 1) return periodLabel(first.period_year, first.period_month);
  return `${periodLabel(first.period_year, first.period_month)} – ${periodLabel(
    last.period_year,
    last.period_month,
  )} · ${sorted.length} months`;
}
