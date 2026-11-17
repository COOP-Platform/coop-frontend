import { useState } from 'react';

import { Button, IconUserCheck, PageHeader, SegmentedControl } from '@/components/ui';
import { useWorkspace } from '@/features/auth';

import { FINES_ENABLED } from '../features';
import { formatAmount } from '../format';
import { THIS_MONTH } from '../month';
import { RecordContributionDialog } from './RecordContributionDialog';
import { SuccessNotice } from './SuccessNotice';
import { usePendingForMe } from '../review-rights';
import { AccountsPage } from './AccountsPage';
import { CommunityArrearsSection } from './Arrears';
import { CashBox } from './CashBox';
import { FinesSection } from './fines/FinesSection';
import { AllPayments, MonthOverview, ReviewQueue } from './MemberContributions';

export type MoneyTab =
  'month' | 'review' | 'arrears' | 'fines' | 'payments' | 'pocket' | 'accounts';

/**
 * Community Money, one message per section:
 * - This month: how the month's contributions are going.
 * - To review: the payments waiting for the Treasurer (reviewers only).
 * - Ibirarane: who still owes for past months (whoever confirms payments).
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
  const { can } = useWorkspace();
  const pending = usePendingForMe();
  const reviews = pending.isReviewer;
  const toReview = pending.rows.length;
  // Who is behind is the Treasurer's to see, like reminders.
  const canSeeArrears = can('finance.contribution.confirm');
  const canSeeFines = FINES_ENABLED && (can('finance.fine.issue') || can('finance.fine.manage'));
  // Shared so switching between This month and All payments keeps the month.
  const [month, setMonth] = useState(THIS_MONTH);
  // The Treasurer records a payment a member made to them directly (the server needs both).
  const canRecordForMember =
    can('finance.contribution.record') && can('finance.contribution.record_for_member');
  const [recordingForMember, setRecordingForMember] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const tabs: { value: MoneyTab; label: string }[] = [
    { value: 'month', label: 'This month' },
    ...(reviews
      ? [
          {
            value: 'review' as const,
            label: toReview > 0 ? `To review (${toReview})` : 'To review',
          },
        ]
      : []),
    ...(canSeeArrears ? [{ value: 'arrears' as const, label: 'Ibirarane' }] : []),
    ...(canSeeFines ? [{ value: 'fines' as const, label: 'Fines' }] : []),
    { value: 'payments', label: 'All payments' },
    { value: 'pocket', label: 'Community pocket' },
    { value: 'accounts', label: 'Bank & MoMo' },
  ];
  // A non-reviewer who follows a ?tab=review link lands on This month.
  const current =
    (tab === 'review' && !reviews) ||
    (tab === 'arrears' && !canSeeArrears) ||
    (tab === 'fines' && !canSeeFines)
      ? 'month'
      : tab;

  return (
    <div className="page">
      <PageHeader
        title="Community Money"
        actions={
          canRecordForMember && (
            <Button
              inline
              icon={<IconUserCheck />}
              onClick={() => {
                setNotice(null);
                setRecordingForMember(true);
              }}
            >
              Record for a member
            </Button>
          )
        }
      />

      {notice && <SuccessNotice text={notice} />}

      {canRecordForMember && (
        <RecordContributionDialog
          open={recordingForMember}
          forMember
          shares={undefined}
          onClose={() => setRecordingForMember(false)}
          onRecorded={(contribution) => {
            setRecordingForMember(false);
            setNotice(
              `${contribution.currency} ${formatAmount(contribution.amount_minor)} recorded for ${contribution.member.full_name}. Pending until someone else confirms it.`,
            );
          }}
        />
      )}

      <SegmentedControl label="Section" options={tabs} value={current} onChange={onTabChange} />

      {current === 'month' && <MonthOverview month={month} onMonthChange={setMonth} />}
      {current === 'review' && <ReviewQueue />}
      {current === 'arrears' && <CommunityArrearsSection />}
      {current === 'fines' && <FinesSection />}
      {current === 'payments' && <AllPayments month={month} onMonthChange={setMonth} />}
      {current === 'pocket' && <CashBox />}
      {current === 'accounts' && <AccountsPage embedded />}
    </div>
  );
}
