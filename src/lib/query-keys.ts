/**
 * Central registry of TanStack Query cache keys.
 * Keeping them here makes invalidation predictable and typo-proof.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  communities: {
    all: ['communities'] as const,
    list: (filters?: Record<string, unknown>) => ['communities', 'list', filters ?? {}] as const,
    detail: (id: string) => ['communities', 'detail', id] as const,
  },
  memberCategories: {
    all: ['member-categories'] as const,
    list: (communityId?: string) => ['member-categories', 'list', communityId ?? null] as const,
  },
  memberships: {
    all: ['memberships'] as const,
    list: (communityId?: string, status?: string) =>
      ['memberships', 'list', communityId ?? null, status ?? null] as const,
    detail: (id: string) => ['memberships', 'detail', id] as const,
  },
  invitations: {
    all: ['invitations'] as const,
    list: (communityId?: string, status?: string) =>
      ['invitations', 'list', communityId ?? null, status ?? null] as const,
  },
  /** Every invitation record visible for a community (`/invitations/?community_id=`). */
  invitationRecords: {
    list: (communityId: string) => ['invitations', 'records', communityId] as const,
  },
  positions: {
    all: (communityId: string) => ['positions', communityId] as const,
    list: (communityId: string) => ['positions', communityId, 'list'] as const,
    member: (communityId: string, membershipId: string) =>
      ['positions', communityId, 'member', membershipId] as const,
  },
  finance: {
    /** Everything finance for one community: invalidated after any money write. */
    all: (communityId: string) => ['finance', communityId] as const,
    openCampaigns: (communityId: string) => ['finance', communityId, 'campaigns', 'open'] as const,
    contributions: (communityId: string, filters: Record<string, unknown>) =>
      ['finance', communityId, 'contributions', filters] as const,
    summary: (communityId: string, year: number) =>
      ['finance', communityId, 'summary', year] as const,
    myContributions: (communityId: string, year: number) =>
      ['finance', communityId, 'my-contributions', year] as const,
    contribution: (communityId: string, id: string) =>
      ['finance', communityId, 'contribution', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
} as const;
