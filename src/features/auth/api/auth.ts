import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isSignedIn } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session';
import { queryKeys } from '@/lib/query-keys';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

/** `accounts.views.LoginView`: a simplejwt pair plus the signed-in user. */
export interface LoginResponse {
  access: string;
  refresh: string;
  must_change_password: boolean;
  user: SessionUser;
}

export function useLogin() {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiFetch<LoginResponse>('/auth/login/', {
        method: 'POST',
        body: credentials,
      }),
  });
}

export interface RegisterRequest {
  email: string;
  full_name: string;
  password: string;
  phone?: string;
}

/**
 * Registration answers 202 with only a message — deliberately the same
 * message whether the address was free or already taken, so the endpoint
 * cannot be used to discover who has an account. There is no user object and
 * no token: the caller signs in afterwards.
 */
export interface RegisterResponse {
  detail: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterRequest) =>
      apiFetch<RegisterResponse>('/auth/register/', {
        method: 'POST',
        body: payload,
      }),
  });
}

export interface MembershipSummary {
  id: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  join_date: string | null;
  community: { id: string; name: string; slug: string };
  member_category: { id: string; name: string };
}

export interface CurrentUser {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  must_change_password: boolean;
  memberships: MembershipSummary[];
}

/**
 * The signed-in user and their memberships — the only thing that ties a user
 * to a community, so it is what every community-scoped screen reads its ids
 * from. Creating a community now enrols the owner, so this is populated from
 * the first community onwards.
 */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiFetch<CurrentUser>('/auth/me/'),
    enabled: isSignedIn(),
    staleTime: 5 * 60_000,
  });
}

/** First active membership, else the first of any status. */
export function primaryMembership(user: CurrentUser | undefined): MembershipSummary | undefined {
  if (user === undefined) {
    return undefined;
  }
  return user.memberships.find((m) => m.status === 'active') ?? user.memberships[0];
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * A voluntary change by someone who knows their current password.
 * `POST /auth/change-password/` replaced the PATCH to `/users/{id}/` this
 * used to go through — `password` is no longer writable there at all.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) =>
      apiFetch<{ detail: string }>('/auth/change-password/', {
        method: 'POST',
        body: payload,
      }),
  });
}
