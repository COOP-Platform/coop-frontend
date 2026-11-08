import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { Button, IconPlusCircle, PageHeader, SegmentedControl } from '@/components/ui';
import { useWorkspace } from '@/features/auth';

import { THIS_MONTH } from '../month';
import { usePendingForMe } from '../review-rights';
import { CashBox } from './CashBox';
import { AllPayments, MonthOverview, ReviewQueue } from './MemberContributions';

export type MoneyTab = 'month' | 'review' | 'payments' | 'pocket';

/**
 * Community Money, one message per section:
 * - This month: how the month's contributions are going.
 * - To review: the payments waiting for the Treasurer (reviewers only).
 * - All payments: every payment members recorded.
 * - Community pocket: all the money the community has and where it came from.
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
  const pending = usePendingForMe();
  // Shared so switching between This month and All payments keeps the month.
  const [month, setMonth] = useState(THIS_MONTH);

  const tabs: { value: MoneyTab; label: string }[] = [
    { value: 'month', label: 'This month' },
    ...(pending.isReviewer
      ? [
          {
            value: 'review' as const,
            label: pending.rows.length > 0 ? `To review (${pending.rows.length})` : 'To review',
          },
        ]
      : []),
    { value: 'payments', label: 'All payments' },
    { value: 'pocket', label: 'Community pocket' },
  ];
  // A non-reviewer who follows a ?tab=review link lands on This month.
  const current = tab === 'review' && !pending.isReviewer ? 'month' : tab;

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

      <SegmentedControl label="Section" options={tabs} value={current} onChange={onTabChange} />

      {current === 'month' && <MonthOverview month={month} onMonthChange={setMonth} />}
      {current === 'review' && <ReviewQueue />}
      {current === 'payments' && <AllPayments month={month} onMonthChange={setMonth} />}
      {current === 'pocket' && <CashBox />}
    </div>
  );
}
