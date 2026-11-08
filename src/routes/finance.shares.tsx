import { createFileRoute, redirect } from '@tanstack/react-router';

/* Shares is now a tab of Budgets & Shares. Old links, bookmarks and emails land there. */
export const Route = createFileRoute('/finance/shares')({
  beforeLoad: () => {
    throw redirect({ to: '/finance/planning', search: { tab: 'shares' as const } });
  },
});
