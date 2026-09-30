import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState, IconCommunity, IconTile, LoadingState } from '@/components/ui';
import { COMMUNITY_APP } from '@/config/apps';
import { useWorkspace } from '@/features/auth';
import { isSignedIn } from '@/lib/auth/session';

/*
 * Layout for the Community app: every /community/* page renders inside the
 * shell with the Community sidebar, for a signed-in user with a community.
 *
 * The guard checks only that a token is stored. An expired one gets past it
 * and the first request's 401 signs the user out (lib/api/client).
 */
export const Route = createFileRoute('/community')({
  beforeLoad: () => {
    if (!isSignedIn()) {
      throw redirect({ to: '/login' });
    }
  },
  component: CommunityLayout,
});

function CommunityLayout() {
  const { isPending, membership } = useWorkspace();

  return (
    <AppShell app={COMMUNITY_APP}>
      {isPending ? (
        <LoadingState label="Loading your community…" />
      ) : membership === undefined ? (
        <section className="card">
          <EmptyState
            icon={
              <IconTile tone="brand" size="lg">
                <IconCommunity />
              </IconTile>
            }
            title="You are not in a community yet"
            message="Create one to get started, or accept an invitation from the email a community sent you."
            action={
              <Link to="/register" className="btn btn--primary btn--inline">
                Create a community
              </Link>
            }
          />
        </section>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
