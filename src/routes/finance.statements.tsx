import { createFileRoute, redirect } from '@tanstack/react-router';

/* The cash flow statement is now the first tab of Reports. Old links, bookmarks and emails land there. */
export const Route = createFileRoute('/finance/statements')({
  beforeLoad: () => {
    throw redirect({ to: '/finance/reports', search: {} });
  },
});
