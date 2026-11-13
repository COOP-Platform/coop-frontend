/*
 * Route guards, for `beforeLoad`.
 *
 * Where a signed-in user lands depends on whether they belong to a community
 * yet: the Community app needs one, onboarding is for the people without.
 * Both sides read the same cached `/auth/me`, so bouncing between them costs
 * one request, not one per hop.
 */
import { redirect } from '@tanstack/react-router';

import { isSignedIn } from '@/lib/auth/session';
import { queryClient } from '@/lib/query-client';

import { hasCommunity, meQueryOptions } from './api/auth';
import type { CurrentUser } from './api/auth';
import { activeMembership } from './api/workspace';

/** Signed in, or off to /login. Returns the current user. */
export async function requireUser(): Promise<CurrentUser> {
  if (!isSignedIn()) {
    throw redirect({ to: '/login' });
  }
  // `fetchQuery`, not `ensureQueryData`: the latter hands back cached data
  // even once invalidated, and creating a community invalidates exactly this
  // — the new owner would be bounced back to onboarding by their old /me.
  return queryClient.fetchQuery(meQueryOptions);
}

/** For the Community app: no community yet means onboarding. */
export async function requireCommunity(): Promise<void> {
  const me = await requireUser();
  if (!hasCommunity(me)) {
    throw redirect({ to: '/onboarding' });
  }
}

/**
 * For pages only some positions may open (S2-08): without `permission` in the
 * selected community the user is sent to `fallback` instead of seeing a page
 * whose every request the API would refuse. Typing the URL is covered too,
 * because this runs on every navigation. Pass several codes to allow any one.
 */
export function requirePermission(
  permission: string | readonly string[],
  fallback: '/community' | '/finance' | '/meetings' = '/community',
) {
  const codes = typeof permission === 'string' ? [permission] : permission;
  return async (): Promise<void> => {
    const me = await requireUser();
    if (!hasCommunity(me)) {
      throw redirect({ to: '/onboarding' });
    }
    const held = new Set(activeMembership(me)?.permissions ?? []);
    if (!codes.some((code) => held.has(code))) {
      throw redirect({ to: fallback });
    }
  };
}

/** For the onboarding welcome: anyone already in a community goes to it. */
export async function requireNoCommunity(): Promise<void> {
  const me = await requireUser();
  if (hasCommunity(me)) {
    throw redirect({ to: '/community' });
  }
}

/** For /login and /register: a live session has no business there. */
export function redirectIfSignedIn(): void {
  if (isSignedIn()) {
    throw redirect({ to: '/' });
  }
}
