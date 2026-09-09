import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export interface CreateMembershipRequest {
  user: string;
  community: string;
  member_category: string;
  status?: MembershipStatus;
  /** Required once status is active — a CHECK constraint enforces it. */
  join_date?: string;
  family_relationship?: string;
  notes?: string;
}

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

/**
 * Creating a community does not make its owner a member — verified against
 * the live API, where `/auth/me/` reports `memberships: []` straight after a
 * successful create. Until the backend does it, the client has to.
 */
export function useCreateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (membership: CreateMembershipRequest) =>
      apiFetch<Membership>('/memberships/', {
        method: 'POST',
        body: membership,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberships.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useUpdateMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<CreateMembershipRequest> }) =>
      apiFetch<Membership>(`/memberships/${id}/`, {
        method: 'PATCH',
        body: changes,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberships.all });
    },
  });
}
