import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { ReportsPage } from '@/features/meetings/components/ReportsPage';

interface Search {
  /** The attendance register when absent. */
  tab?: 'summary';
}

export const Route = createFileRoute('/meetings/reports')({
  // Same permission as the sidebar entry (MEETINGS_APP); without it, the dashboard.
  beforeLoad: requirePermission('meeting.attendance.record', '/meetings'),
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'summary' ? 'summary' : undefined,
  }),
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ReportsPage
      tab={tab ?? 'register'}
      onTabChange={(next) =>
        void navigate({ search: { tab: next === 'summary' ? 'summary' : undefined } })
      }
    />
  );
}
