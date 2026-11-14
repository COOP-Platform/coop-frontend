import { createFileRoute } from '@tanstack/react-router';

import { PlatformHealthPage } from '@/features/platform';

export const Route = createFileRoute('/platform/')({
  component: PlatformHealthPage,
});
