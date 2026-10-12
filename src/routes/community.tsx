import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui';
import { COMMUNITY_APP } from '@/config/apps';
import { requireCommunity, useWorkspace } from '@/features/auth';

/*
 * Layout for the Community app: every /community/* page renders inside the
 * shell with the Community sidebar, for a signed-in user with a community.
 * Anyone without one yet — a fresh sign-up, or someone signing in before
 * founding or joining — is sent to onboarding instead.
 *
 * The token check is local; an expired one gets as far as the `/auth/me`
 * the guard awaits, whose 401 signs the user out (lib/api/client).
 */
export const Route = createFileRoute('/community')({
  beforeLoad: requireCommunity,
  component: CommunityLayout,
});

function CommunityLayout() {
  const { isPending, membership } = useWorkspace();

  // The guard only runs on navigation. Leaving or being removed from the last
  // community refetches /auth/me in place, so the same rule applies here too.
  if (!isPending && membership === undefined) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <AppShell app={COMMUNITY_APP}>
      {isPending ? <LoadingState label="Loading your community…" /> : <Outlet />}
    </AppShell>
  );
}
