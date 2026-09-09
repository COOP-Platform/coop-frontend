/**
 * Static copy for the invite screen's guidelines panel.
 *
 * Not placeholder data any more — the roster feed and contribution categories
 * now come from the API. These three rules are product copy with nothing
 * behind them in the schema: the 7-day figure contradicts
 * `INVITATION_VALID_FOR = timedelta(days=14)` in the backend, and neither the
 * contribution cycle nor 2-step verification exists yet.
 */

export interface Guideline {
  id: string;
  term: string;
  description: string;
}

export const INVITATION_GUIDELINES: readonly Guideline[] = [
  {
    id: 'g1',
    term: '14-day expiration',
    description:
      'invitation links are valid for 14 calendar days before requiring council renewal.',
  },
  {
    id: 'g2',
    term: 'Contribution assignment',
    description: 'Members are enrolled in the category chosen above when they accept.',
  },
  {
    id: 'g3',
    term: 'Security',
    description:
      'The invitation link is shown once and only its hash is stored, so it cannot be retrieved later.',
  },
];
