import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import type { SessionUser } from '@/lib/auth/session';

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

export interface ChangePasswordRequest {
  userId: string;
  password: string;
}

/**
 * There is no dedicated change-password endpoint yet, so this PATCHes the user
 * through the generic `/users/` viewset, where `password` is writable and
 * `UserSerializer.update` runs `set_password`. `must_change_password` is
 * cleared in the same call, otherwise the user is sent back here on next login.
 *
 * The backend should replace this with `POST /auth/change-password/` that
 * verifies the current password and is restricted to the authenticated user —
 * `UserViewSet` currently declares no `permission_classes` at all, so this
 * route is only as safe as the project-wide default.
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
