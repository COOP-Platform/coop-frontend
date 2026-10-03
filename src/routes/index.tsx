import { createFileRoute, redirect } from '@tanstack/react-router';

// The product is organised into apps; Community is the only one built so far,
// so it is where "home" goes (after sign-in, after creating a community, ...).
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/community' });
  },
});
