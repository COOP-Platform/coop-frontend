import { createFileRoute, redirect } from '@tanstack/react-router';

// Member details open in a side panel over the Members list. Old links to
// a member's own page land there instead.
export const Route = createFileRoute('/community/members/$memberId')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/community/members', search: { selected: params.memberId } });
  },
});
