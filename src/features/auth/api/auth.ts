import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isSignedIn } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/session';
import { queryKeys } from '@/lib/query-keys';

export interface LoginCredentials {
  identifier: string;
  password: string;
}

/**
 * Matches `accounts.views.LoginView`: simplejwt access + refresh, plus the
 * flag that decides whether the user goes to the dashboard or is forced
 * through "set a permanent password" first.
 */
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

export interface RegisterResponse {
  message: string;
  user: SessionUser & { must_change_password: boolean; created_by_invitation: boolean };
}

/**
 * Creates an owner account. `RegisterSerializer` sets
 * `must_change_password=false` and `created_by_invitation=false`, so this is
 * the self-signup path — invited members get their account from the (not yet
 * built) invitation-accept endpoint instead.
 *
 * Note it does not return tokens, so a sign-in has to follow.
 */
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
 * The signed-in user and their community memberships — the only endpoint that
 * ties a user to a community, so it is what the invite and community screens
 * read their `community` and `invited_by` ids from.
 */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => apiFetch<CurrentUser>('/auth/me/'),
    // Pointless to ask while unauthenticated: it answers 401 by design.
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
  userId: string;
  password: string;
}

/**
 * There is no dedicated change-password endpoint, so this PATCHes the user
 * through the generic `/users/` viewset, where `password` is writable and
 * `UserSerializer.update` runs `set_password`. `must_change_password` is
 * cleared in the same call, otherwise the user is sent back here on next login.
 *
 * `UserViewSet` declares no `permission_classes`, and it was confirmed against
 * the live API that it accepts unauthenticated writes — so this same call lets
 * anyone reset anyone's password. It must be replaced by
 * `POST /auth/change-password/`, authenticated and verifying the old password.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ userId, password }: ChangePasswordRequest) =>
      apiFetch<{ id: string }>(`/users/${userId}/`, {
        method: 'PATCH',
        body: { password, must_change_password: false },
      }),
  });
}
