import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { AnnouncementsPage } from '@/features/meetings/components/AnnouncementsPage';

interface Search {
  /** The member feed when absent. */
  tab?: 'drafts' | 'expired';
}

export const Route = createFileRoute('/meetings/announcements')({
  // Same permission as the sidebar entry (MEETINGS_APP); without it, the dashboard.
  beforeLoad: requirePermission('announcement.view', '/meetings'),
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'drafts' || raw.tab === 'expired' ? raw.tab : undefined,
  }),
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AnnouncementsPage
      tab={tab ?? 'feed'}
      onTabChange={(next) => void navigate({ search: { tab: next === 'feed' ? undefined : next } })}
    />
  );
}
