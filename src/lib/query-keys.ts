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
  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
} as const;
