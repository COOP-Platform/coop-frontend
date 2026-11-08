import { createFileRoute, redirect } from '@tanstack/react-router';

/* Income is now a tab of Expenses & Income. Old links, bookmarks and emails land there. */
export const Route = createFileRoute('/finance/income')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/finance/expenses-income',
      search: {
        tab: 'income' as const,
        record:
          (search as { record?: unknown }).record === true ||
          (search as { record?: unknown }).record === 'true'
            ? true
            : undefined,
      },
    });
  },
});
