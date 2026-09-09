import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  must_change_password: boolean;
  created_by_invitation: boolean;
  password_changed_at: string | null;
  last_login: string | null;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * WARNING — this endpoint is public. Confirmed against the live API: an
 * unauthenticated GET returns every user with their email, phone and name.
 * It is wired here because it exists, but nothing should build on it until
 * `UserViewSet` gets `permission_classes` and scoping; a member directory
 * should read `/memberships/?community_id=…` instead, which at least ties
 * records to a community.
 */
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => apiFetch<User[]>('/users/'),
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: () => apiFetch<User>(`/users/${id ?? ''}/`),
    enabled: id !== undefined && id !== '',
  });
}
