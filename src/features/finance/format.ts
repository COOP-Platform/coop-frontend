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

/** "10,000 RWF per share", "5,000 RWF per member" or "Any amount". */
export function chargeText(
  charge: 'per_share' | 'fixed' | 'any' | 'per_category',
  amountMinor: number | null,
  currency: string,
): string {
  if (charge === 'per_category') return 'By member category';
  if (charge === 'any' || amountMinor === null) return 'Any amount';
  return `${formatAmount(amountMinor)} ${currency} ${charge === 'per_share' ? 'per share' : 'per member'}`;
}
