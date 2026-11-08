import { useWorkspace } from '@/features/auth';

import { useCommunityContributions } from './api/contributions';
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

/** The pending payments the signed-in reviewer may decide (not their own). */
export function usePendingForMe() {
  const { communityId } = useWorkspace();
  const rights = useReviewRights();
  const isReviewer = rights.canConfirm || rights.canReject;
  // Every month: a late payment for last month still waits.
  const queue = useCommunityContributions(isReviewer ? communityId : undefined, {
    status: 'pending',
    page_size: 100,
  });
  return {
    isReviewer,
    query: queue,
    rows: (queue.data?.items ?? []).filter((row) => !rights.isOwn(row)),
  };
}
