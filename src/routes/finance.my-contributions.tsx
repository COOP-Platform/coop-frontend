import { createFileRoute } from '@tanstack/react-router';

import { MyContributions } from '@/features/finance';

interface MyContributionsSearch {
  /** `?record=true` opens the Record Contribution form. */
  record?: boolean;
}

export const Route = createFileRoute('/finance/my-contributions')({
  validateSearch: (raw: Record<string, unknown>): MyContributionsSearch => ({
    record: raw.record === true || raw.record === 'true' ? true : undefined,
  }),
  component: MyContributionsPage,
});

function MyContributionsPage() {
  const { record } = Route.useSearch();
  return <MyContributions startRecording={record === true} />;
}
