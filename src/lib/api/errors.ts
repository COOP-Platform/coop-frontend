import { ApiError } from './client';

/** The backend's permission refusal names the permission it wanted. */
function requiredPermission(error: ApiError): string | undefined {
  const detail = (error.body as { error?: { required_permission?: unknown } } | null)?.error;
  return typeof detail?.required_permission === 'string' ? detail.required_permission : undefined;
}

/** A sentence to show the user for any failed request. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'last_admin') {
      return 'This would leave nobody able to manage the community. Give someone else an admin position first.';
    }
    if (error.status === 403) {
      const permission = requiredPermission(error);
      return permission
        ? `You don't have permission to do this here (needs ${permission}).`
        : error.message;
    }
    if (error.status === 429) {
      return 'Too many attempts. Wait a little and try again.';
    }
    const firstField = Object.values(error.fieldErrors)[0];
    return firstField ?? error.message;
  }
  if (error instanceof TypeError) {
    // fetch rejects with a TypeError when the server cannot be reached at all.
    return 'Could not reach the server. It may be waking up — try again in a moment.';
  }
  return error instanceof Error ? error.message : 'Something went wrong.';
}
