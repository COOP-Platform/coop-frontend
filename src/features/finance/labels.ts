import type { BadgeTone } from '@/components/ui';

import type {
  ContributionPurpose,
  ContributionStatus,
  PaymentMethod,
} from './api/my-contributions';

export const STATUS_LABEL: Record<ContributionStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pending review', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  REVERSED: { label: 'Reversed', tone: 'neutral' },
};

type ChannelTone = 'warning' | 'danger' | 'info' | 'neutral';

/** `tone` colours the dot beside the channel name. */
export const METHOD_LABEL: Record<PaymentMethod, { label: string; tone: ChannelTone }> = {
  MTN_MOMO: { label: 'MTN MoMo', tone: 'warning' },
  AIRTEL_MONEY: { label: 'Airtel Money', tone: 'danger' },
  BANK_TRANSFER: { label: 'Bank Transfer', tone: 'info' },
  CASH: { label: 'Cash / Physical', tone: 'neutral' },
};

export const PURPOSE_LABEL: Record<ContributionPurpose, string> = {
  MONTHLY: 'Regular Monthly Contribution',
  WELFARE: 'Welfare Contribution',
  SPECIAL_LEVY: 'Special Levy',
};
