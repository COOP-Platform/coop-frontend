import { useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconBadgeCheck,
  IconCheckCircle,
  IconDownload,
  IconEye,
  IconInfoCircle,
  IconPlusCircle,
  IconWallet,
  LoadingState,
  PageHeader,
  SegmentedControl,
  Select,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useCommittee } from '@/features/positions';
import { apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { toPeriod, useMyArrears } from '../api/arrears';
import { useMyFines } from '../api/fines';
import { statementPath, useMyContributions } from '../api/my-contributions';
import type { Contribution } from '../api/my-contributions';
import type { ContributionStatus, ContributionType } from '../api/types';
import { FINES_ENABLED } from '../features';
import { formatAmount } from '../format';
import { METHOD_LABEL, NO_METHOD, STATUS_LABEL, TYPE_LABEL } from '../labels';
import { THIS_YEAR, YEAR_OPTIONS } from '../year-options';
import { ContributionDrawerContent } from './ContributionDrawer';
import { Money } from './Money';
import { MyArrears } from './Arrears';
import { leftToRecord } from './fines/fine-text';
import { MyFines } from './fines/MyFines';
import { RecordContributionDialog } from './RecordContributionDialog';
import type { RecordInitial } from './RecordContributionDialog';

/** The one section the page shows at a time. */
export type MyContributionsView = 'payments' | 'arrears' | 'fines';

const STATUS_FILTERS: { value: ContributionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  ...(Object.keys(STATUS_LABEL) as ContributionStatus[]).map((value) => ({
    value,
    label: STATUS_LABEL[value].label,
  })),
];

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
  const [justRecorded, setJustRecorded] = useState<Contribution | null>(null);
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
  const finesToPay = (fines.data?.items ?? []).filter(
    (fine) => fine.status === 'issued' && fine.outstanding_minor > 0,
  ).length;
  const hasFines = FINES_ENABLED && (fines.data?.items.length ?? 0) > 0;
  const current: MyContributionsView = view === 'fines' && !hasFines ? 'payments' : view;
  const sections: { value: MyContributionsView; label: string }[] = [
    { value: 'payments', label: 'My payments' },
    { value: 'arrears', label: monthsBehind > 0 ? `Ibirarane (${monthsBehind})` : 'Ibirarane' },
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

  function openRecord(initial: RecordInitial | undefined) {
    setPrefill(initial);
    setRecording(true);
  }

  // "Contact your treasurer" names whoever holds that seat, when there is one.
  const committee = useCommittee(communityId);
  const treasurer = (committee.data ?? [])
    .find((seat) => /treasur/i.test(seat.name))
    ?.holders.map((holder) => holder.full_name)
    .join(', ');

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
        eyebrow={<span className="eyebrow eyebrow--muted">Personal Portal</span>}
        title="My Contributions"
        subtitle={`${shares.count} share${shares.count === 1 ? '' : 's'} in ${
          shares.category.name
        } · ${formatAmount(shares.owed_per_month_minor)} ${currency} a month`}
        actions={
          <>
            <Button
              inline
              variant="secondary"
              icon={<IconDownload />}
              disabled={preparing}
              onClick={() => void downloadStatement()}
            >
              {preparing ? 'Preparing…' : 'Download Statement (PDF)'}
            </Button>
            {canRecord && (
              <Button inline icon={<IconPlusCircle />} onClick={() => openRecord(undefined)}>
                Record Contribution
              </Button>
            )}
          </>
        }
      />

      {justRecorded && (
        <div className="notice notice--success" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">Contribution sent for review</p>
            <p className="notice__text">
              {formatAmount(justRecorded.amount_minor)} {justRecorded.currency} paid on{' '}
              {formatDate(justRecorded.paid_at)} is pending. The Treasurer will confirm it
              {justRecorded.proof_count > 0 ? ' using the proof you attached' : ''}, and your
              receipt is ready after that.
            </p>
          </div>
        </div>
      )}

      {statementError && (
        <p className="table__warn" role="alert">
          {statementError}
        </p>
      )}

      <div className="stat-grid stat-grid--three">
        <StatCard
          variant="tint"
          label="Total Contributed"
          value={<Money minor={summary.total_contributed_minor} currency={currency} />}
          caption={
            summary.pending_minor > 0
              ? `${formatAmount(summary.pending_minor)} ${currency} awaiting the Treasurer`
              : `Confirmed payments in ${year}`
          }
          icon={<IconWallet />}
          tone="brand"
        />
        <StatCard
          variant="tint"
          label="Number of Contributions"
          value={summary.count}
          caption={
            summary.on_time_rate === null
              ? 'No monthly payment to measure yet'
              : `${Math.round(summary.on_time_rate)}% paid on time`
          }
          icon={<IconBadgeCheck />}
          tone="info"
        />
        <StatCard
          variant="tint"
          label="Outstanding Amount"
          value={<Money minor={summary.outstanding_minor} currency={currency} />}
          caption={
            summary.outstanding_minor === 0
              ? 'All dues cleared'
              : `Of ${formatAmount(summary.owed_to_date_minor)} ${currency} owed so far`
          }
          icon={<IconCheckCircle />}
          tone={summary.outstanding_minor === 0 ? 'brand' : 'warning'}
          emphasis={summary.outstanding_minor > 0}
        />
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
        <section className="card table-card" aria-labelledby="history-title">
          <header className="table-card__head my-contributions__head">
            <div>
              <h2 id="history-title" className="section-head__title">
                Contribution History
              </h2>
              <p className="section-head__subtitle">
                Every payment recorded for you in {year}, with its review status.
              </p>
            </div>

            <div className="my-contributions__filters">
              <Select
                label="Period"
                value={String(year)}
                onChange={(event) => setYear(Number(event.target.value))}
                options={YEAR_OPTIONS}
              />
              {(items ?? []).length > 0 && (
                <>
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as ContributionStatus | 'all')
                    }
                    options={STATUS_FILTERS}
                  />
                  <Select
                    label="Type"
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
                      Clear filters
                    </Button>
                  )}
                </>
              )}
            </div>
          </header>

          {(items ?? []).length === 0 ? (
            <EmptyState
              icon={<IconWallet width={28} height={28} />}
              title={`No contributions in ${year}`}
              message="Payments you record and the Treasurer confirms will show here."
            />
          ) : shown.length === 0 ? (
            <EmptyState
              icon={<IconWallet width={28} height={28} />}
              title="No payments match these filters"
              message="Try another status or type, or clear the filters."
            />
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Amount</th>
                    <th scope="col">For</th>
                    <th scope="col">Method</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="table__action-col">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => {
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
                        <td className="table__amount">
                          <Money minor={item.amount_minor} currency={item.currency} />
                        </td>
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
                        <td>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </td>
                        <td className="table__action-col">
                          <button
                            type="button"
                            className="link-action"
                            aria-haspopup="dialog"
                            onClick={() => setSelected(item)}
                          >
                            <IconEye width={16} height={16} aria-hidden="true" />
                            View details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <footer className="table-card__foot">
            <IconInfoCircle width={18} height={18} aria-hidden="true" />
            <span>
              Need assistance or correction? Contact your community treasurer
              {treasurer ? ` (${treasurer})` : ''}.
            </span>
          </footer>
        </section>
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
