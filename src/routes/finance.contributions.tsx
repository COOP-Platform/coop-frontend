import { createFileRoute } from '@tanstack/react-router';

import { CommunityContributions, FinanceAccessGate } from '@/features/finance';

export const Route = createFileRoute('/finance/contributions')({
  component: ContributionsPage,
});

function ContributionsPage() {
  return (
    <FinanceAccessGate permission="finance.contribution.view">
      <CommunityContributions />
    </FinanceAccessGate>
  );
}
