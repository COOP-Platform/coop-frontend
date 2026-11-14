import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

/**
 * Plain-language versions of the API's invitation refusals
 * (communities/services.py), shared by the invite dialog and the
 * invitations list's resend / send-again buttons.
 */
export function invitationErrorMessage(error: unknown): string {
  const text =
    error instanceof ApiError ? Object.values(error.fieldErrors).join(' ') || error.message : '';
  const lower = text.toLowerCase();
  if (lower.includes('already an active member')) {
    return 'This person is already a member of this community, so there is nobody to invite.';
  }
  if (lower.includes('suspended member')) {
    return 'This person is a suspended member. Reinstate them from the Members page instead of inviting them again.';
  }
  if (lower.includes('active invitation already exists')) {
    return 'This person already has an invitation waiting. Resend it from the Invitations list instead of sending a second one.';
  }
  if (lower.includes('only a pending invitation can be resent')) {
    return 'This invitation has expired or was closed, so it cannot be resent. Send a new invitation instead.';
  }
  if (lower.includes('expired')) {
    return 'This invitation has expired. Send a new one so they get a fresh link.';
  }
  return errorMessage(error);
}
