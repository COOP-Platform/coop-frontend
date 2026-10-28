import { createFileRoute, redirect } from '@tanstack/react-router';

// Position details open in a side panel over the Positions list. Old links
// to a position's own page land there instead.
export const Route = createFileRoute('/community/positions/$positionId')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/community/positions', search: { selected: params.positionId } });
  },
});
