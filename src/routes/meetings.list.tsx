import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { MeetingsListPage } from '@/features/meetings/components/MeetingsListPage';

interface Search {
  /** Upcoming when absent. */
  tab?: 'past' | 'minutes';
}

export const Route = createFileRoute('/meetings/list')({
  // Same permission as the sidebar entry (MEETINGS_APP); without it, the dashboard.
  beforeLoad: requirePermission('meeting.view', '/meetings'),
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'past' || raw.tab === 'minutes' ? raw.tab : undefined,
  }),
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <MeetingsListPage
      tab={tab ?? 'upcoming'}
      onTabChange={(next) =>
        void navigate({ search: { tab: next === 'upcoming' ? undefined : next } })
      }
    />
  );
}
