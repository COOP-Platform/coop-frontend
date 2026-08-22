import { env } from '@/config/env';

/** Error thrown for any non-2xx response, carrying the HTTP status. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/**
 * Thin fetch wrapper around the backend API.
 * Auth headers get added here in Sprint 2 when JWT login lands.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload as { message?: string } | null)?.message ??
      `Request failed: ${response.status} ${response.statusText}`;
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}
