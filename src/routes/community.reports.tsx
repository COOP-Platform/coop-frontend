import { createFileRoute } from '@tanstack/react-router';

import { CommunityReportsPage } from '@/features/communities/components/CommunityReportsPage';

export const Route = createFileRoute('/community/reports')({
  component: CommunityReportsPage,
});
