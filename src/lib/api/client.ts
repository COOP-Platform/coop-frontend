import { env } from '@/config/env';

/** Field name -> first message, e.g. `{ slug: 'This slug is already taken.' }`. */
export type FieldErrors = Record<string, string>;

/** Error thrown for any non-2xx response, carrying the HTTP status. */
export class ApiError extends Error {
  readonly fieldErrors: FieldErrors;

  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
    fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/** DRF sends `["message"]` far more often than `"message"`. Accept both. */
function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === 'string');
  }
  return undefined;
}

/**
 * Django REST Framework reports validation failures keyed by field —
 * `{"slug": ["Slug must be …"], "name": ["…"]}` — and everything else under
 * `detail` or `non_field_errors`. Splitting the two apart here is what lets a
 * form show a message against the field that actually failed instead of one
 * generic banner.
 */
function parseErrorPayload(payload: unknown): { message?: string; fieldErrors: FieldErrors } {
  const fieldErrors: FieldErrors = {};

  if (typeof payload !== 'object' || payload === null) {
    return { fieldErrors };
  }

  let message: string | undefined;

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    const text = firstMessage(value);
    if (text === undefined) {
      continue;
    }
    if (key === 'detail' || key === 'message' || key === 'non_field_errors') {
      message = text;
    } else {
      fieldErrors[key] = text;
    }
  }

  return { message, fieldErrors };
}

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
    const { message, fieldErrors } = parseErrorPayload(payload);
    throw new ApiError(
      message ?? `Request failed: ${response.status} ${response.statusText}`,
      response.status,
      payload,
      fieldErrors,
    );
  }

  return payload as T;
}
