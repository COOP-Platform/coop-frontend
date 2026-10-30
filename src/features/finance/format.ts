const NUMBER = new Intl.NumberFormat('en-US');

/** Whole RWF with thousands separators: 4820000 -> "4,820,000". No decimals, ever. */
export function formatAmount(amount: number): string {
  return NUMBER.format(Math.round(amount));
}
