import { createFileRoute } from '@tanstack/react-router';

import { AppDashboard } from '@/features/meetings/components/AppDashboard';

export const Route = createFileRoute('/meetings/')({
  component: AppDashboard,
});
