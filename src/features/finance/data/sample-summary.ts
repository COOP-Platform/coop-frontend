/*
 * Placeholder figures from the Figma Finance dashboard, shown until
 * `GET /finance/summary` is live. Delete this file once the API is the only
 * source — nothing else depends on the numbers in it.
 */
import type { FinanceSummary } from '../api/summary';

export const SAMPLE_SUMMARY: FinanceSummary = {
  period: { from: '2026-01-01', to: '2026-12-31' },
  total_contributions: 4_820_000,
  total_expenses: 1_240_000,
  outstanding: 650_000,
  outstanding_count: 13,
  current_balance: 3_580_000,
  members: { active: 42, up_to_date: 29, compliance_rate: 69 },
  recent_activity: [
    {
      type: 'CONTRIBUTION',
      id: 'sample-1',
      title: 'Jean Claude',
      amount: 50_000,
      direction: 'IN',
      at: '2024-05-24T10:00:00Z',
      detail: 'Monthly Contribution',
      method: 'Direct Deposit',
    },
    {
      type: 'EXPENSE',
      id: 'sample-2',
      title: 'Hall Reservation (Q2 Assembly)',
      amount: 120_000,
      direction: 'OUT',
      at: '2024-05-22T10:00:00Z',
      detail: 'Venue Booking',
      method: 'Cheque #0421',
    },
    {
      type: 'CONTRIBUTION',
      id: 'sample-3',
      title: 'Marie Rose Mukamana',
      amount: 50_000,
      direction: 'IN',
      at: '2024-05-20T10:00:00Z',
      detail: 'Monthly Contribution',
      method: 'MTN MoMo',
    },
    {
      type: 'EXPENSE',
      id: 'sample-4',
      title: 'Secretarial Stationery & Printing',
      amount: 18_500,
      direction: 'OUT',
      at: '2024-05-18T10:00:00Z',
      detail: 'Office Supplies',
      method: 'Petty Cash',
    },
    {
      type: 'CONTRIBUTION',
      id: 'sample-5',
      title: 'Solange Uwase',
      amount: 25_000,
      direction: 'IN',
      at: '2024-05-15T10:00:00Z',
      detail: 'Emergency Fund Levy',
      method: 'MTN MoMo',
    },
  ],
  accounts: [
    { name: 'Bank Transfer', balance: 2_850_000, entered_manually: true, detail: 'Bank account' },
    { name: 'MTN Mobile Money', balance: 730_000, entered_manually: true, detail: 'MoMo float' },
  ],
};
