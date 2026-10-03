import { createFileRoute } from '@tanstack/react-router';

import { CommunityDashboard } from '@/features/dashboard';

export const Route = createFileRoute('/community/')({
  component: CommunityDashboard,
});
