import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/** `communities.serializers.MembershipLifecycleSerializer`. */
export interface MembershipLifecycle {
  membership_id: string;
  community_id: string;
  status: 'active' | 'suspended' | 'removed';
  suspended_at: string | null;
  removed_at: string | null;
  permissions: string[];
  is_admin: boolean;
}

export type LifecycleAction = 'suspend' | 'reinstate' | 'remove';

/** End your own membership. No permission needed; the last admin must hand over first. */
export function useLeaveCommunity(communityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<MembershipLifecycle>(`/communities/${communityId}/leave/`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries();
    },
  });
}

/**
 * Suspend / reinstate (need `member.suspend`) and remove (needs
 * `member.remove`). Each is refused with `error.code = "last_admin"` if it
 * would leave nobody able to administer the community.
 */
export function useMemberLifecycle(communityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ membershipId, action }: { membershipId: string; action: LifecycleAction }) =>
      apiFetch<MembershipLifecycle>(
        `/communities/${communityId}/members/${membershipId}/${action}/`,
        { method: 'POST' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberships.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.positions.all(communityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}
