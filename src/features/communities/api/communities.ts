import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/** Mirrors `communities.models.CommunityType`. */
export type CommunityType =
  'family' | 'savings_group' | 'church' | 'cooperative' | 'alumni' | 'ngo' | 'youth_group' | 'club';

export type CommunityStatus = 'active' | 'suspended' | 'archived';

/**
 * What the client may send when creating a community
 * (`CommunityCreateSerializer`). Three things it deliberately does not carry:
 *
 *  - `slug` — generated from the name server-side.
 *  - `owner` — taken from the authenticated user.
 *  - `status` — always starts active.
 *
 * Creating one also enrols the owner as an active member and seeds default
 * contribution categories, so there is nothing left for the client to do
 * afterwards. Only `name` and `type` are required.
 */
export interface CreateCommunityRequest {
  name: string;
  type: CommunityType;
  description?: string;
  vision?: string;
  mission?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  logo_url?: string;
  cover_url?: string;
  currency?: string;
  language?: string;
  founded_year?: number;
}

/** `CommunityUpdateSerializer` accepts a narrower set than create. */
export type UpdateCommunityRequest = Partial<
  Pick<
    CreateCommunityRequest,
    | 'name'
    | 'type'
    | 'description'
    | 'vision'
    | 'mission'
    | 'contact_email'
    | 'contact_phone'
    | 'contact_address'
    | 'currency'
    | 'language'
  >
>;

export interface Community {
  id: string;
  name: string;
  slug: string;
  type: CommunityType;
  description: string | null;
  vision: string | null;
  mission: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  currency: string;
  language: string;
  founded_year: number | null;
  status: CommunityStatus;
  owner: string;
  created_at: string;
  updated_at: string;
}

/** The caller's own communities — owned or joined. Not a platform directory. */
export function useCommunities() {
  return useQuery({
    queryKey: queryKeys.communities.list(),
    queryFn: () => apiFetch<Community[]>('/communities/'),
  });
}

export function useCommunity(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.communities.detail(id ?? ''),
    queryFn: () => apiFetch<Community>(`/communities/${id ?? ''}/`),
    enabled: id !== undefined && id !== '',
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (community: CreateCommunityRequest) =>
      apiFetch<Community>('/communities/', {
        method: 'POST',
        body: community,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
      // The owner is enrolled as part of the create, so their memberships change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useUpdateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateCommunityRequest }) =>
      apiFetch<Community>(`/communities/${id}/`, {
        method: 'PATCH',
        body: changes,
      }),
    onSuccess: (community) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(community.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.list() });
    },
  });
}
