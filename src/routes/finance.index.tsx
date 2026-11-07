import { createFileRoute } from '@tanstack/react-router';

import { FinanceDashboard } from '@/features/finance';

export const Route = createFileRoute('/finance/')({
  component: FinanceDashboard,
});
