import { ApiError } from '@/lib/api/client';

/**
 * Whether a failed request means "this endpoint does not exist on the backend
 * yet". Only then do the finance screens fall back to the design's sample
 * figures; any other failure (server down, 403, 500) is shown as an error
 * rather than dressed up as data.
 */
export function isMissingEndpoint(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
