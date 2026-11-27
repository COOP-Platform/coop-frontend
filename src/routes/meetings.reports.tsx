import { createFileRoute, redirect } from '@tanstack/react-router';

// Reports were removed (everything is on the dashboard). An old link lands
// on the Meetings dashboard instead of being read as a meeting id.
export const Route = createFileRoute('/meetings/reports')({
  beforeLoad: () => {
    throw redirect({ to: '/meetings', replace: true });
  },
});
