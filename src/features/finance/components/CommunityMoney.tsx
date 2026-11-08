import { useNavigate } from '@tanstack/react-router';

import { Button, IconPlusCircle, PageHeader, SegmentedControl } from '@/components/ui';
import { useWorkspace } from '@/features/auth';

import { CashBox } from './CashBox';
import { MemberContributions } from './MemberContributions';

export type MoneyTab = 'members' | 'pocket';

const TABS: { value: MoneyTab; label: string }[] = [
  { value: 'members', label: 'Member contributions' },
  { value: 'pocket', label: 'Community pocket' },
];

/**
 * Community Money: two sections a member can switch between.
 * 1. Member contributions -- what members owe and paid, the Treasurer's
 *    review queue and every payment.
 * 2. Community pocket -- all the money the community has and where it came
 *    from (contributions + other income - expenses).
 */
export function CommunityMoney({
  tab,
  onTabChange,
}: {
  tab: MoneyTab;
  onTabChange: (tab: MoneyTab) => void;
}) {
  const navigate = useNavigate();
  const { can } = useWorkspace();

  return (
    <div className="page">
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">Treasury</span>}
        title="Community Money"
        subtitle="Member contributions, and all the money the community has and where it comes from."
        actions={
          can('finance.contribution.record') && (
            <Button
              inline
              icon={<IconPlusCircle />}
              onClick={() =>
                void navigate({ to: '/finance/my-contributions', search: { record: true } })
              }
            >
              Record Contribution
            </Button>
          )
        }
      />

      <SegmentedControl label="Section" options={TABS} value={tab} onChange={onTabChange} />

      {tab === 'members' ? <MemberContributions /> : <CashBox />}
    </div>
  );
}
