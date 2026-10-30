/*
 * Placeholder rows from the Figma My Contributions screen, shown until
 * `GET /me/contributions` is live. Delete this file once the API is the only
 * source.
 */
import type { MyContribution, MyContributions } from '../api/my-contributions';

const items: MyContribution[] = [
  ['2024-05-24', 'MTN_MOMO', '051'],
  ['2024-04-25', 'BANK_TRANSFER', '042'],
  ['2024-03-28', 'MTN_MOMO', '033'],
  ['2024-02-26', 'CASH', '021'],
  ['2024-01-27', 'MTN_MOMO', '010'],
].map(([paid_on, method, ref]) => ({
  id: `sample-${ref}`,
  amount: 50_000,
  purpose: 'MONTHLY',
  method: method as MyContribution['method'],
  status: 'PAID',
  paid_on: paid_on as string,
  reference: `REC-2024-${ref}`,
}));

export const SAMPLE_MY_CONTRIBUTIONS: MyContributions = {
  summary: { total_contributed: 250_000, count: 5, outstanding: 0, on_time_rate: 100 },
  items,
  total: items.length,
  page: 1,
  page_size: 100,
};
