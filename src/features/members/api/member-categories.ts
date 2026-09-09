import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

export interface MemberCategory {
  id: string;
  community: string;
  name: string;
  description: string | null;
  /** Expected monthly amount in minor units. */
  default_contribution_minor: number;
  is_stipend_recipient: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMemberCategoryRequest {
  community: string;
  name: string;
  description?: string;
  default_contribution_minor?: number;
  is_stipend_recipient?: boolean;
}

/**
 * The contribution tiers a community offers. Required to invite anyone —
 * `Membership.member_category` is non-null, so a community with no categories
 * cannot take members.
 */
export function useMemberCategories(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.memberCategories.list(communityId),
    queryFn: () =>
      apiFetch<MemberCategory[]>(`/member-categories/?community_id=${communityId ?? ''}`),
    enabled: communityId !== undefined && communityId !== '',
  });
}

export function useCreateMemberCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (category: CreateMemberCategoryRequest) =>
      apiFetch<MemberCategory>('/member-categories/', {
        method: 'POST',
        body: category,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberCategories.all });
    },
  });
}
