/**
 * Central registry of TanStack Query cache keys.
 * Keeping them here makes invalidation predictable and typo-proof.
 */
export const queryKeys = {
  communities: {
    all: ['communities'] as const,
    list: (filters?: Record<string, unknown>) => ['communities', 'list', filters ?? {}] as const,
    detail: (id: string) => ['communities', 'detail', id] as const,
  },
  members: {
    all: ['members'] as const,
    list: (communityId: string) => ['members', 'list', communityId] as const,
    detail: (id: string) => ['members', 'detail', id] as const,
  },
} as const;
