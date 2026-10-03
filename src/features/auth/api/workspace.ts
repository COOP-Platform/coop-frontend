/*
 * The community the user is working in, picked from the top bar's switcher.
 *
 * A user can belong to several communities; `/auth/me/` lists them with the
 * positions and permissions held in each. The choice is remembered per
 * browser so a reload lands in the same community.
 */
import { useSyncExternalStore } from 'react';

import type { CurrentUser, MembershipSummary } from './auth';
import { useMe } from './auth';

const STORAGE_KEY = 'coop.community';
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function selectCommunity(communityId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, communityId);
  } catch {
    // Not remembered across reloads; the in-memory switch below still works.
  }
  listeners.forEach((listener) => listener());
}

/** Memberships that give access to a community's screens (not removed). */
function usableMemberships(me: CurrentUser | undefined): MembershipSummary[] {
  return (me?.memberships ?? []).filter((m) => m.status !== 'removed');
}

export interface Workspace {
  me: CurrentUser | undefined;
  isPending: boolean;
  memberships: MembershipSummary[];
  /** The membership in the selected community. Undefined until /me resolves, or if none. */
  membership: MembershipSummary | undefined;
  communityId: string | undefined;
  /** Whether the signed-in user holds a permission in the selected community. */
  can: (permission: string) => boolean;
  /** Their positions here, joined — "Treasurer", "Secretary, Treasurer". */
  roleLabel: string;
}

export function useWorkspace(): Workspace {
  const { data: me, isPending } = useMe();
  const stored = useSyncExternalStore(subscribe, read, () => null);

  const memberships = usableMemberships(me);
  const membership =
    memberships.find((m) => m.community.id === stored) ??
    memberships.find((m) => m.status === 'active') ??
    memberships[0];

  const permissions = new Set(membership?.permissions ?? []);

  return {
    me,
    isPending,
    memberships,
    membership,
    communityId: membership?.community.id,
    can: (permission) => permissions.has(permission),
    roleLabel:
      membership && membership.positions.length > 0
        ? membership.positions.map((p) => p.name).join(', ')
        : 'Member',
  };
}
