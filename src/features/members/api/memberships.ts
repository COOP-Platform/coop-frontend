import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

export type MembershipStatus = 'invited' | 'active' | 'suspended' | 'removed';

export interface Membership {
  id: string;
  user: string;
  community: string;
  member_category: string;
  status: MembershipStatus;
  join_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  family_relationship: string | null;
  notes: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Members of a community. Read-only over the API: joining happens by
 * accepting an invitation, and the owner's own membership is created with
 * the community — so there is nothing for a client to POST here.
 */
export function useMemberships(communityId: string | undefined, status?: MembershipStatus) {
  return useQuery({
    queryKey: queryKeys.memberships.list(communityId, status),
    queryFn: () => {
      const params = new URLSearchParams({ community_id: communityId ?? '' });
      if (status !== undefined) {
        params.set('status', status);
      }
      return apiFetch<Membership[]>(`/memberships/?${params.toString()}`);
    },
    enabled: communityId !== undefined && communityId !== '',
  });
}
