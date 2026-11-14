import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import { MyContributions } from '@/features/finance';

interface MyContributionsSearch {
  /** `?record=true` opens the Record Contribution form. */
  record?: boolean;
}

export const Route = createFileRoute('/finance/my-contributions')({
  // Every member may record their own payment.
  beforeLoad: requirePermission(
    ['finance.contribution.record', 'finance.contribution.view'],
    '/finance',
  ),
  validateSearch: (raw: Record<string, unknown>): MyContributionsSearch => ({
    record: raw.record === true || raw.record === 'true' ? true : undefined,
  }),
  component: MyContributionsPage,
});

function MyContributionsPage() {
  const { record } = Route.useSearch();
  return <MyContributions startRecording={record === true} />;
}
