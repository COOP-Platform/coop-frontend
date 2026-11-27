import { reviewsContributions, useWorkspace } from '@/features/auth';

import { useCommunityContributions } from './api/contributions';
import type { Contribution } from './api/my-contributions';

/** What the signed-in reviewer may do to one payment, and why not. */
export function useReviewRights() {
  const { can, membership } = useWorkspace();
  return {
    /** Sees pending, rejected and reversed payments (reviewers and the Auditor). */
    oversees: reviewsContributions(can),
    canConfirm: can('finance.contribution.confirm'),
    canReject: can('finance.contribution.reject'),
    canReverse: can('finance.contribution.reverse'),
    canRemind: can('finance.contribution.confirm'),
    /**
     * A payment they paid or recorded. They may still confirm or reject it;
     * only reversing their own is refused (backend `own_contribution`).
     */
    isOwn: (row: Contribution) =>
      membership !== undefined &&
      (row.member.membership_id === membership.id ||
        row.recorded_by.membership_id === membership.id),
  };
}

/** The pending payments the signed-in reviewer may decide, their own included. */
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
    rows: queue.data?.items ?? [],
  };
}
