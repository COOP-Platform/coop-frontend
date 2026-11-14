import { createFileRoute } from '@tanstack/react-router';

import { PlatformCommunitiesPage } from '@/features/platform';

export const Route = createFileRoute('/platform/communities/')({
  component: PlatformCommunitiesPage,
});
