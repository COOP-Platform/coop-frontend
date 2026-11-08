import { useId, useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconBadgeCheck,
  IconBellAlert,
  IconCheckCircle,
  IconClipboardClock,
  IconCommunity,
  IconEye,
  IconSearch,
  IconWallet,
  LoadingState,
  SegmentedControl,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { useCommunityContributions } from '../api/contributions';
import type { Contribution } from '../api/my-contributions';
import type { ContributionStatus } from '../api/types';
import { METHOD_LABEL, NO_METHOD, STATUS_LABEL, TYPE_LABEL, periodLabel } from '../labels';
import { monthName } from '../month';
import { usePendingForMe, useReviewRights } from '../review-rights';
import { ContributionDrawerContent } from './ContributionDrawer';
import { Money } from './Money';
import { MonthPicker } from './MonthPicker';
import { Pager } from './ReasonPrompt';
import { RemindersDialog, ReviewActions } from './ReviewActions';
import { SuccessNotice } from './SuccessNotice';

/*
 * The member-contribution sections of Community Money, one message each:
 *  - MonthOverview: how this month is going.
 *  - ReviewQueue:   the payments waiting for the Treasurer.
 *  - AllPayments:   every payment members recorded, to search and open.
 * Every member reads every record (1 Nov decision); only reviewers act.
 */

const PAGE_SIZE = 20;

interface MonthProps {
  /** `YYYY-MM`, shared by the sections so switching keeps the month. */
  month: string;
  onMonthChange: (month: string) => void;
}

// ---------------------------------------------------------------------------
// This month
// ---------------------------------------------------------------------------

/** How the month is going: expected, received, waiting, who paid. */
export function MonthOverview({ month, onMonthChange }: MonthProps) {
  const { communityId } = useWorkspace();
  const rights = useReviewRights();
  const [reminding, setReminding] = useState(false);
  const summaryQuery = useCommunityContributions(communityId, { month, page_size: 1 });
  const label = monthName(month);

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">{label} at a glance</h2>
          <p className="table__muted">What members owe for the month and what has come in.</p>
        </div>
        <div className="section-bar__actions">
          <MonthPicker value={month} onChange={onMonthChange} />
          {rights.canRemind && (
            <Button
              variant="secondary"
              inline
              icon={<IconBellAlert />}
              onClick={() => setReminding(true)}
            >
              Remind unpaid
            </Button>
          )}
        </div>
      </div>

      {summaryQuery.data === undefined ? (
        summaryQuery.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(summaryQuery.error)} />
        )
      ) : (
        <MonthCards summary={summaryQuery.data.summary} label={label} />
      )}

      <RemindersDialog
        open={reminding}
        month={month}
        monthLabel={label}
        onClose={() => setReminding(false)}
      />
    </div>
  );
}

function MonthCards({
  summary,
  label,
}: {
  summary: NonNullable<ReturnType<typeof useCommunityContributions>['data']>['summary'];
  label: string;
}) {
  const currency = summary.currency;
  return (
    <div className="stat-grid stat-grid--four">
      <StatCard
        label="Expected"
        value={<Money minor={summary.expected_minor} currency={currency} />}
        caption={`From every member's shares for ${label}`}
        icon={<IconWallet />}
        tone="info"
      />
      <StatCard
        label="Received"
        value={<Money minor={summary.received_minor} currency={currency} />}
        caption={
          summary.collection_rate === null
            ? 'Nothing expected this month'
            : `${Math.round(summary.collection_rate)}% collected`
        }
        icon={<IconBadgeCheck />}
        tone="brand"
      />
      <StatCard
        label="Awaiting review"
        value={<Money minor={summary.pending_minor} currency={currency} />}
        caption="Recorded, not yet confirmed"
        icon={<IconClipboardClock />}
        tone="warning"
        emphasis={summary.pending_minor > 0}
      />
      <StatCard
        label="Members paid"
        value={`${summary.paid_count} / ${summary.member_count}`}
        caption={`With a confirmed payment for ${label}`}
        icon={<IconCommunity />}
        tone="info"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// To review
// ---------------------------------------------------------------------------

/** The Treasurer's queue: approve or reject each pending payment. */
export function ReviewQueue() {
  const pending = usePendingForMe();
  const [selected, setSelected] = useState<Contribution | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function done(message: string) {
    setNotice(message);
    setSelected(null);
  }

  if (pending.query.data === undefined) {
    return pending.query.isPending ? (
      <LoadingState />
    ) : (
      <ErrorState message={errorMessage(pending.query.error)} />
    );
  }

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">Payments waiting for your review</h2>
          <p className="table__muted">
            Check each payment and its proof, then approve or reject it. The member is emailed
            either way.
          </p>
        </div>
      </div>

      {notice && <SuccessNotice text={notice} />}

      <section className="card table-card" aria-label="Payments waiting for review">
        {pending.rows.length === 0 ? (
          <EmptyState
            icon={<IconCheckCircle width={28} height={28} />}
            title="Nothing waiting for you"
            message="Payments members record show up here for you to approve or reject."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">For</th>
                  <th scope="col">Amount</th>
                  <th scope="col" className="table__action-col">
                    Decision
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="table__row--clickable"
                    onClick={(event) => {
                      if (!(event.target as HTMLElement).closest('button')) setSelected(row);
                    }}
                  >
                    <td>
                      <MemberCell row={row} />
                    </td>
                    <td>
                      <PurposeCell row={row} />
                    </td>
                    <td>
                      <span className="table__stack">
                        <span className="table__amount">
                          <Money minor={row.amount_minor} currency={row.currency} />
                        </span>
                        <MethodCell row={row} />
                        <span className="table__muted">Paid {formatDate(row.paid_at)}</span>
                      </span>
                    </td>
                    <td className="table__action-col">
                      <ReviewActions row={row} compact onDone={done} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentDrawer selected={selected} onClose={() => setSelected(null)} onDone={done} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// All payments
// ---------------------------------------------------------------------------

type StatusFilter = 'all' | ContributionStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reversed', label: 'Reversed' },
];

/** Every payment members recorded for the month: search, filter, open. */
export function AllPayments({ month, onMonthChange }: MonthProps) {
  const searchId = useId();
  const { communityId } = useWorkspace();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Contribution | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const label = monthName(month);

  const list = useCommunityContributions(communityId, {
    month,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  function done(message: string) {
    setNotice(message);
    setSelected(null);
  }

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">Payments for {label}</h2>
          <p className="table__muted">Every payment members recorded. Open one for details.</p>
        </div>
        <div className="section-bar__actions">
          <MonthPicker
            value={month}
            onChange={(value) => {
              onMonthChange(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {notice && <SuccessNotice text={notice} />}

      <div className="toolbar card">
        <div className="search-field">
          <label htmlFor={searchId} className="visually-hidden">
            Search by member or reference
          </label>
          <span className="search-field__icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            id={searchId}
            type="search"
            className="search-field__input"
            placeholder="Search member or reference..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="toolbar__controls">
          <SegmentedControl
            label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {list.data === undefined ? (
        list.isPending ? (
          <LoadingState />
        ) : (
          <ErrorState message={errorMessage(list.error)} />
        )
      ) : (
        <section className="card table-card" aria-label={`Payments for ${label}`}>
          {list.data.items.length === 0 ? (
            <EmptyState
              icon={<IconWallet width={28} height={28} />}
              title={`No payments for ${label}`}
              message={
                status === 'all' && !search
                  ? 'Payments members record for this month will show here.'
                  : 'Nothing matches these filters.'
              }
            />
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">For</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="table__action-col">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.items.map((row) => {
                    const badge = STATUS_LABEL[row.status];
                    return (
                      <tr
                        key={row.id}
                        className={
                          row.id === selected?.id
                            ? 'table__row--clickable is-selected'
                            : 'table__row--clickable'
                        }
                        onClick={(event) => {
                          if (!(event.target as HTMLElement).closest('button')) setSelected(row);
                        }}
                      >
                        <td>
                          <MemberCell row={row} />
                        </td>
                        <td>
                          <PurposeCell row={row} />
                        </td>
                        <td>
                          <span className="table__stack">
                            <span className="table__amount">
                              <Money minor={row.amount_minor} currency={row.currency} />
                            </span>
                            <MethodCell row={row} />
                          </span>
                        </td>
                        <td>
                          <Badge tone={badge.tone}>{badge.label}</Badge>
                        </td>
                        <td className="table__action-col">
                          <button
                            type="button"
                            className="link-action"
                            aria-haspopup="dialog"
                            onClick={() => setSelected(row)}
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

          <footer className="table-footer">
            <p className="table-footer__summary">
              Showing <strong>{list.data.items.length}</strong> of{' '}
              <strong>{list.data.total}</strong> payments
            </p>
            <Pager
              page={page}
              pageCount={Math.max(1, Math.ceil(list.data.total / PAGE_SIZE))}
              onChange={setPage}
            />
          </footer>
        </section>
      )}

      <PaymentDrawer selected={selected} onClose={() => setSelected(null)} onDone={done} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function PaymentDrawer({
  selected,
  onClose,
  onDone,
}: {
  selected: Contribution | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  return (
    <Drawer
      open={selected !== null}
      onClose={onClose}
      label={selected ? `Payment by ${selected.member.full_name}` : 'Payment details'}
    >
      {selected && (
        <ContributionDrawerContent
          contribution={selected}
          showMember
          actions={(row) => <ReviewActions row={row} onDone={onDone} />}
        />
      )}
    </Drawer>
  );
}

function MemberCell({ row }: { row: Contribution }) {
  return (
    <span className="table__person">
      <Avatar name={row.member.full_name} />
      <span className="table__stack">
        <span className="table__name">{row.member.full_name}</span>
        <span className="table__muted">{row.member_category.name}</span>
      </span>
    </span>
  );
}

function PurposeCell({ row }: { row: Contribution }) {
  return (
    <span className="table__stack">
      <span>
        {row.contribution_type === 'dedicated' && row.campaign
          ? row.campaign.title
          : TYPE_LABEL[row.contribution_type]}
      </span>
      <span className="table__muted">{periodLabel(row.period_year, row.period_month)}</span>
    </span>
  );
}

function MethodCell({ row }: { row: Contribution }) {
  const method = row.payment_method ? METHOD_LABEL[row.payment_method] : NO_METHOD;
  return (
    <span className="table__stack">
      <span className="channel">
        <span className={`channel-dot channel-dot--${method.tone}`} aria-hidden="true" />
        {method.label}
      </span>
      {row.payment_reference && <span className="table__muted mono">{row.payment_reference}</span>}
    </span>
  );
}
