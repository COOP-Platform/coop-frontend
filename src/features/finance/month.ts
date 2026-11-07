import { periodLabel } from './labels';

const pad = (n: number) => String(n).padStart(2, '0');

/** This month as the API's `YYYY-MM`. */
export const THIS_MONTH = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
})();

/** `2026-11` -> "November 2026". */
export function monthName(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return periodLabel(year ?? 0, m ?? null);
}
