import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { MeetingDetailPage } from '@/features/meetings/components/MeetingDetailPage';

interface Search {
  /** Agenda when absent. */
  tab?: 'attendance' | 'minutes';
}

export const Route = createFileRoute('/meetings/$meetingId')({
  // Same permission as the sidebar entry (MEETINGS_APP); without it, the dashboard.
  beforeLoad: requirePermission('meeting.view', '/meetings'),
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'attendance' || raw.tab === 'minutes' ? raw.tab : undefined,
  }),
  component: Page,
});

function Page() {
  const { meetingId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <MeetingDetailPage
      key={meetingId}
      meetingId={meetingId}
      tab={tab ?? 'agenda'}
      onTabChange={(next) =>
        void navigate({ search: { tab: next === 'agenda' ? undefined : next }, replace: true })
      }
    />
  );
}
