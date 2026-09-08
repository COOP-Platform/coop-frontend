/**
 * PLACEHOLDER — NOT WIRED TO THE API.
 *
 * These screens are driven by an invitation token in the URL, and there is no
 * endpoint behind them. Two are missing:
 *
 *  - `GET /api/invitations/verify/?token=…` — resolve a raw token to the
 *    invitee's name, the community, the sponsoring member and the assigned
 *    contribution category, so this screen can be rendered at all. The model
 *    stores only `token_hash`, so lookup must hash the incoming token; the
 *    generic `/api/invitations/` list cannot do it and must not expose hashes.
 *  - `POST /api/invitations/accept/` — verify the token, check `expires_at`,
 *    create the `User` with `must_change_password=True` and
 *    `created_by_invitation=True`, create the `Membership`, then stamp
 *    `accepted_at`/`accepted_user` and dispatch the credential email.
 *
 * Until both exist, "Accept Invitation & Continue" only advances the UI. The
 * values below match the design so the screens can be reviewed.
 */

export interface AllocationBenefit {
  title: string;
  detail: string;
}

export const INVITE_PREVIEW = {
  inviteeFirstName: 'Diane',
  inviteeEmail: 'diane.mutesi@example.rw',
  communityName: 'Les Cousins',
  sponsorName: 'Jean-Paul Mugisha',
  sponsorInitials: 'JM',
  sponsorCommittee: 'Treasury & Membership Committee',
  sponsorTitle: 'Secretary',
  activeMembers: 48,
  location: 'Kigali, Rwanda',
} as const;

export const INVITE_ALLOCATION: {
  role: string;
  benefits: readonly AllocationBenefit[];
} = {
  role: 'Family Member / Contributor',
  benefits: [
    { title: 'Tontine Rotation', detail: 'Tier 2 monthly draw eligibility' },
    { title: 'Voting Rights', detail: '1 weighted consensus ballot' },
    { title: 'Family Archive', detail: 'Lineage records & meetings' },
  ],
};

export const ACTIVATION_STEPS: readonly string[] = [
  'Verify Identity',
  'Set Credentials',
  'Access Vault',
];

/** Shown on the "You're all set" screen — all server-issued in reality. */
export const ACCOUNT_SUMMARY = {
  memberId: '#COM-2024-882',
  community: 'Les Cousins Kinship & Trust',
  role: 'Registered Member',
} as const;
