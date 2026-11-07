import { useWorkspace } from '@/features/auth';

import type { Contribution } from './api/my-contributions';

/** What the signed-in reviewer may do to one payment, and why not. */
export function useReviewRights() {
  const { can, membership } = useWorkspace();
  return {
    canConfirm: can('finance.contribution.confirm'),
    canReject: can('finance.contribution.reject'),
    canReverse: can('finance.contribution.reverse'),
    canRemind: can('finance.contribution.confirm'),
    /** Nobody decides a payment they paid or recorded (backend `own_contribution`). */
    isOwn: (row: Contribution) =>
      membership !== undefined &&
      (row.member.membership_id === membership.id ||
        row.recorded_by.membership_id === membership.id),
  };
}
