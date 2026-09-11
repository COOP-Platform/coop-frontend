/**
 * Static copy for the invite screen's guidelines panel.
 *
 * Product wording backed by real behaviour: the 14 days is
 * `INVITATION_VALID_FOR` in the backend, and the password rule is how
 * `POST /invitations/accept/` actually works.
 */

export interface Guideline {
  id: string;
  term: string;
  description: string;
}

export const INVITATION_GUIDELINES: readonly Guideline[] = [
  {
    id: 'expiry',
    term: '14-day expiry',
    description: 'the emailed link stops working after 14 days and has to be reissued.',
  },
  {
    id: 'password',
    term: 'They choose their password',
    description:
      'no password is ever emailed — the member sets their own when they accept, and is signed in straight away.',
  },
  {
    id: 'resend',
    term: 'Resend if the email fails',
    description:
      'an invitation whose email did not go out is flagged in the list, and can be resent from there.',
  },
];
