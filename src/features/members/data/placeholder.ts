/**
 * PLACEHOLDER — NOT WIRED TO THE API.
 *
 * The roster feed needs invitations and memberships for the signed-in user's
 * community. `GET /api/invitations/?community_id=…` and
 * `GET /api/memberships/?community_id=…` both exist, but the community id has
 * to come from the session (`/auth/me/` returns memberships), and the two
 * lists have to be merged and sorted to produce this feed. Until the session
 * is wired the design's rows stand in.
 *
 * Contribution categories are real data too — `GET /api/member-categories/
 * ?community_id=…` — and are the same story.
 */

export type RosterState = 'pending' | 'joined' | 'active';

export interface RosterEntry {
  id: string;
  name: string;
  /** Line under the name, e.g. "Pending Invitation · Sent 2h ago". */
  detail: string;
  state: RosterState;
  stateLabel: string;
}

export const RECENT_INVITATIONS: readonly RosterEntry[] = [
  {
    id: 'r1',
    name: 'Diane Mutesi',
    detail: 'Pending Invitation · Sent 2h ago',
    state: 'pending',
    stateLabel: 'Pending',
  },
  {
    id: 'r2',
    name: 'Christian Shema',
    detail: 'Registered Yesterday · Regular',
    state: 'joined',
    stateLabel: 'Joined',
  },
  {
    id: 'r3',
    name: 'Sarah Ganza',
    detail: 'Active Contributor · 150,000 RWF',
    state: 'active',
    stateLabel: 'Active',
  },
];

export interface Guideline {
  id: string;
  term: string;
  description: string;
}

export const INVITATION_GUIDELINES: readonly Guideline[] = [
  {
    id: 'g1',
    term: '7-day expiration',
    description: 'invitation links are valid for 7 calendar days before requiring council renewal.',
  },
  {
    id: 'g2',
    term: 'Contribution assignment',
    description: 'Members will be automatically enrolled in the active cycle (Q2 2025) upon login.',
  },
  {
    id: 'g3',
    term: 'Security',
    description:
      'All accounts require 2-step verification using their Rwandan registered mobile number.',
  },
];

/** Stand-in for `GET /api/member-categories/?community_id=…`. */
export const CONTRIBUTION_CATEGORIES = [
  { value: 'standard-adult', label: 'Standard adult member' },
  { value: 'young-adult', label: 'Young adult member' },
  { value: 'elder', label: 'Elder (stipend recipient)' },
  { value: 'associate', label: 'Associate member' },
] as const;
