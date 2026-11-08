import { THIS_MONTH } from './month';

/** A statement period of whole months, `YYYY-MM` to `YYYY-MM`, both included. */
export interface Period {
  from: string;
  to: string;
}

export type PeriodPreset =
  'this_month' | 'last_3' | 'last_6' | 'this_year' | 'last_year' | 'custom';

export const PRESET_LABEL: Record<PeriodPreset, string> = {
  this_month: 'This month',
  last_3: 'Last 3 months',
  last_6: 'Last 6 months',
  this_year: 'This year',
  last_year: 'Last year',
  custom: 'Custom',
};

/** The backend reports cover at most this many months. */
export const MAX_MONTHS = 60;

const pad = (n: number) => String(n).padStart(2, '0');

/** `2026-11` moved by `delta` months. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = (y ?? 0) * 12 + ((m ?? 1) - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** How many months from `from` to `to`, both included. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return ((ty ?? 0) - (fy ?? 0)) * 12 + ((tm ?? 0) - (fm ?? 0)) + 1;
}

export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>): Period {
  const year = Number(THIS_MONTH.slice(0, 4));
  switch (preset) {
    case 'this_month':
      return { from: THIS_MONTH, to: THIS_MONTH };
    case 'last_3':
      return { from: addMonths(THIS_MONTH, -2), to: THIS_MONTH };
    case 'last_6':
      return { from: addMonths(THIS_MONTH, -5), to: THIS_MONTH };
    case 'this_year':
      return { from: `${year}-01`, to: THIS_MONTH };
    case 'last_year':
      return { from: `${year - 1}-01`, to: `${year - 1}-12` };
  }
}

/** The same number of months, just before `period`: what "vs previous period" compares with. */
export function previousPeriod(period: Period): Period {
  const span = monthsBetween(period.from, period.to);
  return { from: addMonths(period.from, -span), to: addMonths(period.from, -1) };
}

/** Last day of a `YYYY-MM` month as `YYYY-MM-DD`, capped at today. */
export function lastDay(month: string): string {
  const next = addMonths(month, 1);
  const [y, m] = next.split('-').map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, 0);
  const iso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const today = new Date().toLocaleDateString('en-CA');
  return iso > today ? today : iso;
}
