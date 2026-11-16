import { createFileRoute } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { COMMUNITY_APP } from '@/config/apps';
import { requireCommunity } from '@/features/auth';
import { NotificationsPage } from '@/features/notifications';

/*
 * All of the user's notifications, from the bell's "See all". They span every
 * community, so the page belongs to no app; it borrows the Community shell
 * (top bar and sidebar) so the user can carry on from here.
 */
export const Route = createFileRoute('/notifications')({
  beforeLoad: requireCommunity,
  component: NotificationsRoute,
});

function NotificationsRoute() {
  return (
    <AppShell app={COMMUNITY_APP}>
      <NotificationsPage />
    </AppShell>
  );
}
