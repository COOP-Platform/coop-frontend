import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/**
 * Mirrors `communities.models.CommunityType`. Field names are snake_case
 * throughout because Django REST Framework serializes the model fields
 * directly — there is no camelCase mapping layer on either side.
 */
export type CommunityType =
  'family' | 'savings_group' | 'church' | 'cooperative' | 'alumni' | 'ngo' | 'youth_group' | 'club';

export type CommunityStatus = 'active' | 'suspended' | 'archived';

export interface CommunityFields {
  name: string;
  slug: string;
  type: CommunityType;
  description?: string | null;
  vision?: string | null;
  mission?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_address?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  currency?: string;
  language?: string;
  founded_year?: number | null;
}

/**
 * `owner` is required by the serializer and must be supplied by the client —
 * the viewset has no `perform_create` deriving it from the request. Callers
 * pass the signed-in user's id; it should move server-side, at which point
 * this field comes off the request type.
 */
export interface CreateCommunityRequest extends CommunityFields {
  owner: string;
}

export interface Community extends CommunityFields {
  id: string;
  status: CommunityStatus;
  owner: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Unpaginated: the viewset returns a plain array. */
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
      // A new community changes what /auth/me/ reports.
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useUpdateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Partial<CommunityFields> }) =>
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

/** Soft delete — the model stamps `deleted_at` and the list filters it out. */
export function useDeleteCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/communities/${id}/`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
    },
  });
}

/** Derives a slug from free text — for generating one from the community name. */
export function slugify(value: string): string {
  return sanitizeSlug(value).replace(/-+$/, '');
}

/**
 * The live-typing variant. It deliberately keeps a trailing hyphen: stripping
 * it on every keystroke would delete the `-` in "les-" the moment it is typed,
 * which makes a multi-word slug impossible to enter by hand. Callers trim the
 * trailing hyphen when submitting instead.
 */
export function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .slice(0, 60);
}
