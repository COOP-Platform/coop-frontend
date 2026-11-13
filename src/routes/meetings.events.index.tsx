import { createFileRoute } from '@tanstack/react-router';

import { EventsPage } from '@/features/meetings/components/EventsPage';
import type { EventsTab } from '@/features/meetings/components/EventsPage';

interface Search {
  /** Upcoming when absent. */
  tab?: 'past' | 'cancelled';
}

export const Route = createFileRoute('/meetings/events/')({
  validateSearch: (raw: Record<string, unknown>): Search => ({
    tab: raw.tab === 'past' || raw.tab === 'cancelled' ? raw.tab : undefined,
  }),
  component: Page,
});

function Page() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <EventsPage
      tab={tab ?? 'upcoming'}
      onTabChange={(next: EventsTab) =>
        void navigate({ search: { tab: next === 'upcoming' ? undefined : next } })
      }
    />
  );
}
