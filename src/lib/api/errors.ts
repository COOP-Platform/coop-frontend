import { ApiError } from './client';

/** The backend's permission refusal names the permission it wanted. */
function requiredPermission(error: ApiError): string | undefined {
  const detail = (error.body as { error?: { required_permission?: unknown } } | null)?.error;
  return typeof detail?.required_permission === 'string' ? detail.required_permission : undefined;
}

/** The server's own sentence, unless it sent none and we only have the status line. */
function serverSentence(error: ApiError): string | undefined {
  return error.message.startsWith('Request failed:') ? undefined : error.message;
}

/** Friendly words for backend codes that need no server sentence to explain. */
const CODE_MESSAGES: Record<string, string> = {
  last_admin:
    'This would leave nobody able to manage the community. Give someone else an admin position first.',
};

/** Codes whose server sentence is best (it names the year or item), with a fallback. */
const CODE_FALLBACKS: Record<string, string> = {
  year_closed:
    'That financial year is closed, so nothing dated in it can be added, changed or reversed. Ask the Treasurer to reopen the year if this must change.',
  own_income: 'You recorded this income, so someone else has to approve or reject it.',
  year_not_over: 'That year is not over yet. A year can be closed once it has ended.',
};

/** A sentence to show the user for any failed request. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const code = error.code ?? '';
    const known = Object.hasOwn(CODE_MESSAGES, code) ? CODE_MESSAGES[code] : undefined;
    if (known !== undefined) return known;
    const fallback = Object.hasOwn(CODE_FALLBACKS, code) ? CODE_FALLBACKS[code] : undefined;
    if (fallback !== undefined) return serverSentence(error) ?? fallback;
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
