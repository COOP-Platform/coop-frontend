import { createFileRoute, redirect } from '@tanstack/react-router';

/* Expenses is now a tab of Expenses & Income. Old links, bookmarks and emails land there. */
export const Route = createFileRoute('/finance/expenses')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/finance/expenses-income',
      search: {
        record:
          (search as { record?: unknown }).record === true ||
          (search as { record?: unknown }).record === 'true'
            ? true
            : undefined,
      },
    });
  },
});
