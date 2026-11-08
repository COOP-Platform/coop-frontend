import { createFileRoute, redirect } from '@tanstack/react-router';

/* Bank & MoMo accounts are now a tab of Community Money. Old links, bookmarks and emails land there. */
export const Route = createFileRoute('/finance/accounts')({
  beforeLoad: () => {
    throw redirect({ to: '/finance/money', search: { tab: 'accounts' as const } });
  },
});
