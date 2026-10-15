import { createFileRoute, redirect } from '@tanstack/react-router';

// Inviting is a popup on the Invitations page now; old links open it there.
export const Route = createFileRoute('/community/invitations/new')({
  beforeLoad: () => {
    throw redirect({ to: '/community/invitations', search: { invite: true } });
  },
});
