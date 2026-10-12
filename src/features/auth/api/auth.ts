import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';

import { ApiError, apiFetch } from '@/lib/api/client';
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

/**
 * Registration succeeded (or was quietly absorbed) but signing in with the
 * same password failed — so the address already had an account, with a
 * different password. The register response cannot say so; this is the only
 * point at which the client learns it, and only because the caller just
 * typed the password themselves.
 */
export class ExistingAccountError extends Error {
  constructor() {
    super('An account may already exist for this email address.');
    this.name = 'ExistingAccountError';
  }
}

/**
 * Create an account and sign straight into it. Registration hands back no
 * token by design (see `RegisterResponse`), so the follow-up login is what
 * turns "account created" into a session.
 */
export function useSignUp() {
  return useMutation({
    mutationFn: async (payload: RegisterRequest): Promise<LoginResponse> => {
      await apiFetch<RegisterResponse>('/auth/register/', { method: 'POST', body: payload });

      try {
        return await apiFetch<LoginResponse>('/auth/login/', {
          method: 'POST',
          body: { identifier: payload.email, password: payload.password },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          throw new ExistingAccountError();
        }
        throw error;
      }
    },
  });
}

/** `rbac.serializers.PositionSummarySerializer` — a position someone holds. */
export interface PositionSummary {
  id: string;
  name: string;
  /** Holds every permission needed to manage positions and members. */
  is_admin: boolean;
}

/** `accounts.serializers.MeMembershipSerializer`. */
export interface MembershipSummary {
  id: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  join_date: string | null;
  community: { id: string; name: string; slug: string; type: string };
  member_category: { id: string; name: string };
  /** Every live position held, whatever the membership's status. */
  positions: PositionSummary[];
  /** Resolved permission codes here — empty unless the membership is active. */
  permissions: string[];
  is_admin: boolean;
}

export interface CurrentUser {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  must_change_password: boolean;
  is_platform_admin: boolean;
  platform_permissions: string[];
  memberships: MembershipSummary[];
}

/**
 * Shared by `useMe` and the route guards, which await it in `beforeLoad` to
 * decide between the Community app and onboarding before anything renders.
 */
export const meQueryOptions = queryOptions({
  queryKey: queryKeys.auth.me,
  queryFn: () => apiFetch<CurrentUser>('/auth/me/'),
  staleTime: 5 * 60_000,
});

/**
 * The signed-in user and their memberships — the only thing that ties a user
 * to a community, so it is what every community-scoped screen reads its ids
 * from. Creating a community now enrols the owner, so this is populated from
 * the first community onwards.
 */
export function useMe() {
  return useQuery({ ...meQueryOptions, enabled: isSignedIn() });
}

/** Memberships that give access to a community's screens (not removed). */
export function usableMemberships(me: CurrentUser | undefined): MembershipSummary[] {
  return (me?.memberships ?? []).filter((m) => m.status !== 'removed');
}

/**
 * Whether the user has somewhere to land in the Community app. Without one,
 * a signed-in user belongs on onboarding — fresh sign-ups, and anyone whose
 * last membership was removed.
 */
export function hasCommunity(me: CurrentUser | undefined): boolean {
  return usableMemberships(me).length > 0;
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
