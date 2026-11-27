import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconBadgeCheck,
  IconHistory,
  IconCheckCircle,
  IconDownload,
  IconEye,
  IconPlusCircle,
  IconWallet,
  LoadingState,
  PageHeader,
  SectionCard,
  SegmentedControl,
  Select,
  StatCard,
  TableFooter,
  usePaged,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { toPeriod, useMyArrears } from '../api/arrears';
import { useMyFines } from '../api/fines';
import { statementPath, useMyContributions } from '../api/my-contributions';
import type { Contribution, ContributionDetail } from '../api/my-contributions';
import type { ContributionStatus, ContributionType } from '../api/types';
import { FINES_ENABLED } from '../features';
import { formatAmount } from '../format';
import { METHOD_LABEL, NO_METHOD, STATUS_LABEL, TYPE_LABEL, periodLabel } from '../labels';
import { usePaidUpTo } from '../paid-up-to';
import { THIS_YEAR, YEAR_OPTIONS } from '../year-options';
import { ContributionDrawerContent } from './ContributionDrawer';
import { Money } from './Money';
import { MyArrears } from './Arrears';
import { leftToRecord } from './fines/fine-text';
import { MyFines } from './fines/MyFines';
import { RecordContributionDialog } from './RecordContributionDialog';
import type { RecordInitial } from './RecordContributionDialog';

/** The whole payment: every row it was split into, or the one row. */
const recordedTotal = (c: ContributionDetail) =>
  c.split?.reduce((sum, row) => sum + row.amount_minor, 0) ?? c.amount_minor;

/** The one section the page shows at a time. */
export type MyContributionsView = 'payments' | 'arrears' | 'fines';

const STATUS_FILTERS: { value: ContributionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  ...(Object.keys(STATUS_LABEL) as ContributionStatus[]).map((value) => ({
    value,
    label: STATUS_LABEL[value].label,
  })),
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

interface MyContributionsProps {
  /** Open the Record Contribution form on arrival (from the dashboard's button). */
  startRecording?: boolean;
  view?: MyContributionsView;
  onViewChange?: (view: MyContributionsView) => void;
}

export function MyContributions({
  startRecording = false,
  view = 'payments',
  onViewChange,
}: MyContributionsProps) {
  const { communityId, can } = useWorkspace();
  const canRecord = can('finance.contribution.record');
  const [recording, setRecording] = useState(startRecording && canRecord);
  // Set when the form is opened from an unpaid month ("Pay" in Ibirarane).
  const [prefill, setPrefill] = useState<RecordInitial | undefined>(undefined);
  const [justRecorded, setJustRecorded] = useState<ContributionDetail | null>(null);
  const [year, setYear] = useState(THIS_YEAR);
  const [selected, setSelected] = useState<Contribution | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ContributionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ContributionType | 'all'>('all');

  const { data, isPending, error } = useMyContributions(communityId, year);
  // Only for the counts on the section switch; each section reads the same cached data.
  const arrears = useMyArrears(communityId);
  const fines = useMyFines(communityId);
  const monthsBehind = arrears.data?.months_behind ?? 0;
  // How far ahead a member who owes nothing has paid ("Paid up to June 2027").
  const paidUpTo = usePaidUpTo(
    communityId,
    data?.shares.owed_per_month_minor,
    arrears.data !== undefined && arrears.data.total_minor === 0,
  );
  const finesToPay = (fines.data?.items ?? []).filter(
    (fine) => fine.status === 'issued' && fine.outstanding_minor > 0,
  ).length;
  const hasFines = FINES_ENABLED && (fines.data?.items.length ?? 0) > 0;
  const current: MyContributionsView = view === 'fines' && !hasFines ? 'payments' : view;
  const sections: { value: MyContributionsView; label: string }[] = [
    { value: 'payments', label: 'Payments' },
    {
      value: 'arrears',
      label: monthsBehind > 0 ? `Unpaid months (${monthsBehind})` : 'Unpaid months',
    },
    ...(hasFines
      ? [{ value: 'fines' as const, label: finesToPay > 0 ? `Fines (${finesToPay})` : 'Fines' }]
      : []),
  ];

  const items = data?.items;
  // Only the types this member actually has, so a type filter never comes up empty.
  const typeFilters = useMemo(() => {
    const present = new Set((items ?? []).map((item) => item.contribution_type));
    return [
      { value: 'all', label: 'All types' },
      ...(Object.keys(TYPE_LABEL) as ContributionType[])
        .filter((value) => present.has(value))
        .map((value) => ({ value, label: TYPE_LABEL[value] })),
    ];
  }, [items]);
  const shown = (items ?? []).filter(
    (item) =>
      (statusFilter === 'all' || item.status === statusFilter) &&
      (typeFilter === 'all' || item.contribution_type === typeFilter),
  );
  const filtering = statusFilter !== 'all' || typeFilter !== 'all';
  const paged = usePaged(shown);
  // Confirmed money per month of the chosen year, oldest first, for the trend line.
  const monthlyTrend = useMemo(() => {
    const lastMonth = year === THIS_YEAR ? new Date().getMonth() + 1 : 12;
    const totals = Array.from({ length: lastMonth }, () => 0);
    for (const item of items ?? []) {
      if (item.status !== 'confirmed') continue;
      const month = Number(item.paid_at.slice(5, 7));
      if (month >= 1 && month <= lastMonth) {
        totals[month - 1] = (totals[month - 1] ?? 0) + item.amount_minor;
      }
    }
    return totals;
  }, [items, year]);
  // Ibirarane paid this year: arrears payments the Treasurer confirmed, and those still waiting.
  const arrearsPayments = (items ?? []).filter((item) => item.contribution_type === 'arrears');
  const arrearsPaid = arrearsPayments.filter((item) => item.status === 'confirmed');
  const arrearsPaidMinor = arrearsPaid.reduce((sum, item) => sum + item.amount_minor, 0);
  const arrearsWaitingMinor = arrearsPayments
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + item.amount_minor, 0);

  function openRecord(initial: RecordInitial | undefined) {
    setPrefill(initial);
    setRecording(true);
  }

  async function downloadStatement() {
    if (communityId === undefined) return;
    setStatementError(null);
    setPreparing(true);
    try {
      await apiDownload(statementPath(communityId, year), `statement-${year}.pdf`);
    } catch (error) {
      setStatementError(errorMessage(error));
    } finally {
      setPreparing(false);
    }
  }

  if (data === undefined) {
    return isPending ? <LoadingState /> : <ErrorState message={errorMessage(error)} />;
  }
  const { summary, shares } = data;
  const currency = summary.currency;

  return (
    <div className="page">
      <PageHeader
        title="My Contributions"
        subtitle={`${currency} ${formatAmount(shares.owed_per_month_minor)} a month · ${plural(
          shares.count,
          'share',
        )}`}
        actions={
          <>
            <Button
              inline
              variant="secondary"
              icon={<IconDownload />}
              disabled={preparing}
              aria-label={`Download ${year} statement (PDF)`}
              onClick={() => void downloadStatement()}
            >
              {preparing ? 'Preparing…' : 'Statement'}
            </Button>
            {canRecord && (
              <Button inline icon={<IconPlusCircle />} onClick={() => openRecord(undefined)}>
                Record payment
              </Button>
            )}
          </>
        }
      />

      {justRecorded && (
        <div className="notice notice--success" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">
              {justRecorded.status === 'confirmed' ? 'Recorded' : 'Sent for review'}
            </p>
            <p className="notice__text">
              {currency} {formatAmount(recordedTotal(justRecorded))} paid on{' '}
              {formatDate(justRecorded.paid_at)}{' '}
              {justRecorded.status === 'confirmed'
                ? 'counts now: you confirm payments, so it needs no review.'
                : 'is pending until the Treasurer confirms it.'}
            </p>
            {(justRecorded.split?.length ?? 0) > 1 && (
              <p className="notice__text">
                Split over {justRecorded.split?.length} months:{' '}
                {justRecorded.split
                  ?.map((row) => periodLabel(row.period_year, row.period_month ?? 1))
                  .join(', ')}{' '}
                (oldest unpaid first, the rest paid ahead).
              </p>
            )}
          </div>
        </div>
      )}

      {statementError && (
        <p className="table__warn" role="alert">
          {statementError}
        </p>
      )}

      <div className="stat-grid">
        <StatCard
          label="Total contributed"
          value={<Money minor={summary.total_contributed_minor} currency={currency} />}
          caption={
            summary.pending_minor > 0 ? (
              <>
                <b className="caption-warn">
                  {currency} {formatAmount(summary.pending_minor)}
                </b>{' '}
                pending
              </>
            ) : year === THIS_YEAR ? (
              'This year'
            ) : (
              `In ${year}`
            )
          }
          icon={<IconWallet />}
          tone="brand"
          trend={monthlyTrend}
        />
        <StatCard
          label="Payments"
          value={summary.count}
          caption={
            summary.on_time_rate === null
              ? undefined
              : `${Math.round(summary.on_time_rate)}% on time`
          }
          icon={<IconBadgeCheck />}
          tone="info"
        />
        <StatCard
          label="Paid for past months"
          value={<Money minor={arrearsPaidMinor} currency={currency} />}
          caption={
            arrearsWaitingMinor > 0 ? (
              <>
                <b className="caption-warn">
                  {currency} {formatAmount(arrearsWaitingMinor)}
                </b>{' '}
                pending
              </>
            ) : (
              plural(arrearsPaid.length, 'payment')
            )
          }
          icon={<IconHistory />}
          tone="accent"
        />
        {year === THIS_YEAR && summary.outstanding_minor === 0 && paidUpTo ? (
          <StatCard
            label="Paid up to"
            value={`${periodLabel(...paidUpTo.upTo)}${paidUpTo.orLater ? '+' : ''}`}
            caption={[
              paidUpTo.ahead === 0
                ? 'This month is paid'
                : `${plural(paidUpTo.ahead, 'month')} ahead`,
              paidUpTo.pendingUpTo && `${periodLabel(...paidUpTo.pendingUpTo)} waiting for review`,
            ]
              .filter(Boolean)
              .join(' · ')}
            icon={<IconCheckCircle />}
            tone="brand"
          />
        ) : (
          <StatCard
            label="Outstanding"
            value={<Money minor={summary.outstanding_minor} currency={currency} />}
            caption={
              summary.outstanding_minor === 0
                ? 'All clear'
                : monthsBehind > 0
                  ? `${plural(monthsBehind, 'month')} behind`
                  : `Of ${currency} ${formatAmount(summary.owed_to_date_minor)}`
            }
            icon={<IconCheckCircle />}
            tone="warning"
            emphasis={summary.outstanding_minor > 0}
          />
        )}
      </div>

      <SegmentedControl
        label="Show"
        options={sections}
        value={current}
        onChange={(next) => onViewChange?.(next)}
      />

      {current === 'arrears' && (
        <MyArrears
          onPay={
            canRecord
              ? (month) => {
                  if (month.record_as === null) return;
                  openRecord({
                    type: month.record_as,
                    period: toPeriod(month),
                    amountMinor: month.remaining_minor,
                  });
                }
              : undefined
          }
        />
      )}

      {current === 'fines' && (
        <MyFines
          onPay={
            canRecord
              ? (fine) =>
                  openRecord({ type: 'fine', fineId: fine.id, amountMinor: leftToRecord(fine) })
              : undefined
          }
        />
      )}

      {current === 'payments' && (
        <SectionCard
          title="History"
          flush
          actions={
            <>
              <Select
                label="Year"
                labelHidden
                value={String(year)}
                onChange={(event) => setYear(Number(event.target.value))}
                options={YEAR_OPTIONS}
              />
              {(items ?? []).length > 0 && (
                <>
                  <Select
                    label="Status"
                    labelHidden
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as ContributionStatus | 'all')
                    }
                    options={STATUS_FILTERS}
                  />
                  <Select
                    label="Type"
                    labelHidden
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value as ContributionType | 'all')
                    }
                    options={typeFilters}
                  />
                  {filtering && (
                    <Button
                      inline
                      variant="tint"
                      onClick={() => {
                        setStatusFilter('all');
                        setTypeFilter('all');
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </>
              )}
            </>
          }
          footer={shown.length > 0 ? <TableFooter {...paged} onPage={paged.setPage} /> : undefined}
        >
          {(items ?? []).length === 0 ? (
            <EmptyState
              icon={<IconWallet width={28} height={28} />}
              title={`No payments in ${year}`}
            />
          ) : shown.length === 0 ? (
            <EmptyState icon={<IconWallet width={28} height={28} />} title="No matching payments" />
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Method</th>
                    <th scope="col">Paid into</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col" className="table__action-col">
                      <span className="visually-hidden">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((item) => {
                    const status = STATUS_LABEL[item.status];
                    const method = item.payment_method
                      ? METHOD_LABEL[item.payment_method]
                      : NO_METHOD;
                    return (
                      <tr
                        key={item.id}
                        className={
                          item.id === selected?.id
                            ? 'table__row--clickable is-selected'
                            : 'table__row--clickable'
                        }
                        // The whole row opens the details; the button keeps its own click.
                        onClick={(event) => {
                          if (!(event.target as HTMLElement).closest('button')) setSelected(item);
                        }}
                      >
                        <td>{formatDate(item.paid_at)}</td>
                        <td>{TYPE_LABEL[item.contribution_type]}</td>
                        <td>
                          <span className="channel">
                            <span
                              className={`channel-dot channel-dot--${method.tone}`}
                              aria-hidden="true"
                            />
                            {method.label}
                          </span>
                        </td>
                        <td>{item.account?.name ?? '—'}</td>
                        <td className="num">
                          <Money minor={item.amount_minor} currency={item.currency} />
                        </td>
                        <td>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="table__action-col">
                          <button
                            type="button"
                            className="link-action"
                            aria-haspopup="dialog"
                            aria-label={`View details, ${formatDate(item.paid_at)}`}
                            onClick={() => setSelected(item)}
                          >
                            <IconEye width={16} height={16} aria-hidden="true" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        label={
          selected
            ? `Contribution details, ${formatDate(selected.paid_at)}`
            : 'Contribution details'
        }
      >
        {selected && <ContributionDrawerContent contribution={selected} />}
      </Drawer>

      <RecordContributionDialog
        open={recording}
        onClose={() => setRecording(false)}
        shares={shares}
        initial={prefill}
        onRecorded={(contribution) => {
          setRecording(false);
          setJustRecorded(contribution);
          setYear(contribution.period_year);
          // Show the new payment in the list, where the notice above points.
          setStatusFilter('all');
          setTypeFilter('all');
          onViewChange?.('payments');
        }}
      />
    </div>
  );
}
