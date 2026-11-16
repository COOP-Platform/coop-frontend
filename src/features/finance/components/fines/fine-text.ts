import type { BadgeTone } from '@/components/ui';
import { formatDate } from '@/lib/format/date';

import type { Fine, FineKind, FineMeetingRef, FineSuggestion } from '../../api/fines';
import { formatAmount } from '../../format';
import { periodLabel } from '../../labels';

export const FINE_KIND_LABEL: Record<FineKind, string> = {
  late_payment: 'Late payment',
  meeting_absence: 'Missed a meeting',
  other: 'Other',
};

export const FINE_KIND_OPTIONS = (Object.keys(FINE_KIND_LABEL) as FineKind[]).map((kind) => ({
  value: kind,
  label: FINE_KIND_LABEL[kind],
}));

/** Left to pay once what is already waiting for the Treasurer is counted. */
export function leftToRecord(fine: Fine): number {
  return Math.max(fine.outstanding_minor - fine.pending_minor, 0);
}

/** Waived / Paid / Waiting for the Treasurer / To pay. */
export function fineStatus(fine: Fine): { label: string; tone: BadgeTone } {
  if (fine.status === 'waived') return { label: 'Waived', tone: 'neutral' };
  if (fine.is_paid || fine.outstanding_minor === 0) return { label: 'Paid', tone: 'success' };
  if (fine.pending_minor > 0 && leftToRecord(fine) === 0)
    return { label: 'Waiting for the Treasurer', tone: 'warning' };
  return { label: 'To pay', tone: 'danger' };
}

const meetingText = (meeting: FineMeetingRef) =>
  `missing ${meeting.title} on ${formatDate(meeting.scheduled_at)}`;

/** What the fine is for, in a few words: "paying October 2026 late". */
export function fineFor(
  fine: Pick<Fine, 'kind' | 'period_year' | 'period_month' | 'meeting' | 'reason'>,
): string {
  if (fine.kind === 'late_payment' && fine.period_year !== null)
    return `paying ${periodLabel(fine.period_year, fine.period_month)} late`;
  if (fine.kind === 'meeting_absence' && fine.meeting) return meetingText(fine.meeting);
  return fine.reason;
}

/** "A fine of 1,000 RWF for paying October 2026 late." */
export function fineSentence(
  fine: Pick<
    Fine | FineSuggestion,
    'kind' | 'period_year' | 'period_month' | 'meeting' | 'reason' | 'amount_minor'
  > & { currency?: string },
): string {
  return `A fine of ${formatAmount(fine.amount_minor)} ${fine.currency ?? 'RWF'} for ${fineFor(fine)}`;
}
