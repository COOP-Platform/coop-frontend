import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui';
import { MEETINGS_APP } from '@/config/apps';
import { requireCommunity, useWorkspace } from '@/features/auth';

/*
 * Layout for the Meetings & Events app: every /meetings/* page renders inside
 * the shell with this app's sidebar, for a signed-in user with a community.
 * Same guard as Finance: no community means onboarding.
 */
export const Route = createFileRoute('/meetings')({
  beforeLoad: requireCommunity,
  component: MeetingsLayout,
});

function MeetingsLayout() {
  const { isPending, membership } = useWorkspace();

  if (!isPending && membership === undefined) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <AppShell app={MEETINGS_APP}>
      {isPending ? <LoadingState label="Loading meetings…" /> : <Outlet />}
    </AppShell>
  );
}
