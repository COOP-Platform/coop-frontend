import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PositionSummary } from '@/features/auth';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/** `rbac.serializers.PositionSerializer` — `GET /communities/{id}/positions/`. */
export interface Position {
  id: string;
  name: string;
  description: string | null;
  /** Seeded from the community type's suggestion. Editable like any other. */
  is_system: boolean;
  /** Holds every permission needed to manage positions and members. */
  is_admin: boolean;
  permissions: string[];
  holder_count: number;
}

/** `rbac.serializers.MemberPositionsSerializer`. */
export interface MemberPositions {
  membership_id: string;
  positions: PositionSummary[];
  /** Union across every position held; empty unless the membership is active. */
  permissions: string[];
  is_admin: boolean;
}

export interface PositionInput {
  name: string;
  description?: string;
  /** Replaces the whole set on update. Codes from PERMISSION_CATALOG. */
  permissions?: string[];
}

const base = (communityId: string) => `/communities/${communityId}`;

/** Needs `position.view`. Sorted by name server-side. */
export function usePositions(communityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.positions.list(communityId ?? ''),
    queryFn: () => apiFetch<Position[]>(`${base(communityId ?? '')}/positions/`),
    enabled: enabled && communityId !== undefined,
  });
}

/**
 * Positions held by each of several members.
 *
 * There is no bulk endpoint: the member list (`/memberships/`) does not carry
 * positions, so this is one `GET .../members/{id}/positions/` per member.
 * Fine at pilot scale; see docs/sprint-2-integration.md for the backend ask.
 */
export function useMembersPositions(
  communityId: string | undefined,
  membershipIds: readonly string[],
  enabled = true,
) {
  const results = useQueries({
    queries: membershipIds.map((membershipId) => ({
      queryKey: queryKeys.positions.member(communityId ?? '', membershipId),
      queryFn: () =>
        apiFetch<MemberPositions>(`${base(communityId ?? '')}/members/${membershipId}/positions/`),
      enabled: enabled && communityId !== undefined,
      staleTime: 60_000,
    })),
  });

  const byMembership = new Map<string, MemberPositions>();
  results.forEach((result, index) => {
    const id = membershipIds[index];
    if (result.data && id !== undefined) byMembership.set(id, result.data);
  });

  return {
    byMembership,
    isPending: results.some((r) => r.isPending && r.fetchStatus !== 'idle'),
  };
}

function useInvalidatePositions(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.positions.all(communityId) });
    // Your own positions and permissions come from /me.
    void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  };
}

export function useCreatePosition(communityId: string) {
  const invalidate = useInvalidatePositions(communityId);
  return useMutation({
    mutationFn: (input: PositionInput) =>
      apiFetch<Position>(`${base(communityId)}/positions/`, { method: 'POST', body: input }),
    onSuccess: invalidate,
  });
}

export function useUpdatePosition(communityId: string) {
  const invalidate = useInvalidatePositions(communityId);
  return useMutation({
    mutationFn: ({ id, ...input }: PositionInput & { id: string }) =>
      apiFetch<Position>(`${base(communityId)}/positions/${id}/`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: invalidate,
  });
}

export function useDeletePosition(communityId: string) {
  const invalidate = useInvalidatePositions(communityId);
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`${base(communityId)}/positions/${id}/`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

/** Adds a position; never replaces. Assigning one already held is a no-op (200). */
export function useAssignPosition(communityId: string) {
  const invalidate = useInvalidatePositions(communityId);
  return useMutation({
    mutationFn: ({ membershipId, positionId }: { membershipId: string; positionId: string }) =>
      apiFetch<MemberPositions>(`${base(communityId)}/members/${membershipId}/positions/`, {
        method: 'POST',
        body: { position_id: positionId },
      }),
    onSuccess: invalidate,
  });
}

/** Removes one position; the member's others stay. Refused with `last_admin`. */
export function useRevokePosition(communityId: string) {
  const invalidate = useInvalidatePositions(communityId);
  return useMutation({
    mutationFn: ({ membershipId, positionId }: { membershipId: string; positionId: string }) =>
      apiFetch<MemberPositions>(
        `${base(communityId)}/members/${membershipId}/positions/${positionId}/`,
        { method: 'DELETE' },
      ),
    onSuccess: invalidate,
  });
}
