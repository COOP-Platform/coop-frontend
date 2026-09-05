import { useMutation } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

// TODO(Sprint 2): confirm the real endpoint + response shape against the
// backend auth contract. Placeholder shape until then.
export interface LoginCredentials {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  token: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: credentials,
      }),
  });
}
