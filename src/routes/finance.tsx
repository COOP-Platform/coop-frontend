import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui';
import { FINANCE_APP } from '@/config/apps';
import { requireCommunity, useWorkspace } from '@/features/auth';

/*
 * Layout for the Finance app: every /finance/* page renders inside the shell
 * with the Finance sidebar, for a signed-in user with a community. Same guard
 * as the Community app — finance belongs to a community, so no community means
 * onboarding.
 */
export const Route = createFileRoute('/finance')({
  beforeLoad: requireCommunity,
  component: FinanceLayout,
});

function FinanceLayout() {
  const { isPending, membership } = useWorkspace();

  if (!isPending && membership === undefined) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <AppShell app={FINANCE_APP}>
      {isPending ? <LoadingState label="Loading your finances…" /> : <Outlet />}
    </AppShell>
  );
}
