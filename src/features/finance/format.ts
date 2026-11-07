const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Minor units per RWF, as the backend stores money (`MINOR_UNITS_PER_MAJOR`). */
export const MINOR_PER_MAJOR = 100;

/**
 * An amount from the API (integer minor units) as RWF with thousands
 * separators: 482000000 -> "4,820,000". Fractions of a franc show only when
 * there are any.
 */
export function formatAmount(minor: number): string {
  return NUMBER.format(minor / MINOR_PER_MAJOR);
}
