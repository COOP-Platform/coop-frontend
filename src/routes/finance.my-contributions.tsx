import { createFileRoute } from '@tanstack/react-router';

import { MyContributions } from '@/features/finance';

export const Route = createFileRoute('/finance/my-contributions')({
  component: MyContributions,
});
