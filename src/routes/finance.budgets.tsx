import { createFileRoute, redirect } from '@tanstack/react-router';

/* Budgets is now a tab of Budgets & Shares. Old links, bookmarks and emails land there. */
export const Route = createFileRoute('/finance/budgets')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/finance/planning',
      search: {
        tab: (search as { tab?: unknown }).tab === 'campaigns' ? ('campaigns' as const) : undefined,
      },
    });
  },
});
