import { createFileRoute } from '@tanstack/react-router';

import { ReportsPage } from '@/features/meetings/components/ReportsPage';

interface Search {
  /** The attendance register when absent. */
  tab?: 'summary';
}

export const Route = createFileRoute('/meetings/reports')({
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
