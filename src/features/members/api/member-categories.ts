import { useQuery } from '@tanstack/react-query';

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

/**
 * The contribution tiers a community offers. Read-only over the API —
 * creating a community seeds its defaults server-side, and there is no
 * create endpoint for these.
 */
export function useMemberCategories(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.memberCategories.list(communityId),
    queryFn: () =>
      apiFetch<MemberCategory[]>(`/member-categories/?community_id=${communityId ?? ''}`),
    enabled: communityId !== undefined && communityId !== '',
  });
}
