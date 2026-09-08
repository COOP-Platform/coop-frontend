import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

/**
 * Mirrors `communities.models.CommunityType` on the backend. Field names are
 * snake_case throughout because Django REST Framework serializes the model
 * fields directly — no camelCase mapping layer exists on either side yet.
 */
export type CommunityType =
  'family' | 'savings_group' | 'church' | 'cooperative' | 'alumni' | 'ngo' | 'youth_group' | 'club';

export type CommunityStatus = 'active' | 'suspended' | 'archived';

export interface CreateCommunityRequest {
  name: string;
  slug: string;
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
  // `owner` is deliberately absent: the backend should derive it from the
  // authenticated user. Today CommunitySerializer leaves it writable and the
  // viewset has no perform_create, so this POST will fail validation until
  // either that is fixed or auth lands and we send the current user's id.
}

export interface Community extends CreateCommunityRequest {
  id: string;
  status: CommunityStatus;
  owner: string;
  created_at: string;
  updated_at: string;
}

export function useCreateCommunity() {
  return useMutation({
    mutationFn: (community: CreateCommunityRequest) =>
      apiFetch<Community>('/communities/', {
        method: 'POST',
        body: community,
      }),
  });
}

/** Derives a slug from free text — used to generate one from the community name. */
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
