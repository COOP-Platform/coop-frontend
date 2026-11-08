import { createFileRoute, redirect } from '@tanstack/react-router';

/* The page was renamed Community Money; old links and bookmarks land there. */
export const Route = createFileRoute('/finance/contributions')({
  beforeLoad: () => {
    throw redirect({ to: '/finance/money' });
  },
});
