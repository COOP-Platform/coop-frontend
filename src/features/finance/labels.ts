import type { BadgeTone } from '@/components/ui';

import type { ExpenseStatus } from './api/expenses';
import type { IncomeSource, IncomeStatus } from './api/income';
import type { ContributionStatus, ContributionType, PaymentMethod } from './api/types';

export const STATUS_LABEL: Record<ContributionStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending review', tone: 'warning' },
  confirmed: { label: 'Paid', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  reversed: { label: 'Reversed', tone: 'neutral' },
};

type ChannelTone = 'warning' | 'danger' | 'info' | 'neutral';

/** `tone` colours the dot beside the channel name. */
export const METHOD_LABEL: Record<PaymentMethod, { label: string; tone: ChannelTone }> = {
  mobile_money: { label: 'Mobile Money', tone: 'warning' },
  bank_transfer: { label: 'Bank Transfer', tone: 'info' },
  cash: { label: 'Cash', tone: 'neutral' },
};

/** For a payment recorded without a method. */
export const NO_METHOD: { label: string; tone: ChannelTone } = {
  label: 'Not given',
  tone: 'neutral',
};

export const TYPE_LABEL: Record<ContributionType, string> = {
  monthly: 'Monthly contribution',
  one_off: 'One-off contribution',
  arrears: 'Arrears',
  fine: 'Fine',
  dedicated: 'Dedicated contribution',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "November 2026" for a payment's period. */
export function periodLabel(year: number, month: number | null): string {
  return month === null ? String(year) : `${MONTHS[month - 1] ?? ''} ${year}`;
}

/** A raw category or method from the cash flow ("one_off") made readable ("One off"). */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const EXPENSE_STATUS: Record<ExpenseStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Awaiting approval', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
  reversed: { label: 'Reversed', tone: 'neutral' },
};

export const INCOME_STATUS: Record<IncomeStatus, { label: string; tone: BadgeTone }> = {
  recorded: { label: 'Recorded', tone: 'success' },
  reversed: { label: 'Reversed', tone: 'neutral' },
};

export const INCOME_SOURCE: Record<IncomeSource, string> = {
  donation: 'Donation',
  event_revenue: 'Event revenue',
  interest: 'Interest',
  other: 'Other',
};
