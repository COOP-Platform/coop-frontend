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
  IconChevronLeft,
  IconChevronRight,
  IconClipboardClock,
  IconCommunity,
  IconEye,
  IconSearch,
  IconWallet,
  Input,
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
import { ContributionDrawerContent } from './ContributionDrawer';
import { Money } from './Money';
import { useReviewRights } from '../review-rights';
import { RemindersDialog, ReviewActions } from './ReviewActions';

const PAGE_SIZE = 20;

const pad = (n: number) => String(n).padStart(2, '0');
const THIS_MONTH = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
})();

function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return periodLabel(year ?? 0, m ?? null);
}

type StatusFilter = 'all' | ContributionStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reversed', label: 'Reversed' },
];

/**
 * The "Member contributions" section of Community Money. Every contribution
 * in the community (1 Nov: every member reads every record). Whoever reviews
 * payments -- the Treasurer -- also gets the queue of payments waiting for
 * them, with Approve / Reject, and Reverse in the details of a confirmed one.
 */
export function MemberContributions() {
  const searchId = useId();
  const { communityId } = useWorkspace();
  const rights = useReviewRights();
  const isReviewer = rights.canConfirm || rights.canReject;

  const [month, setMonth] = useState(THIS_MONTH);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Contribution | null>(null);
  const [reminding, setReminding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const list = useCommunityContributions(communityId, {
    month,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
    page,
    page_size: PAGE_SIZE,
  });
  // The queue spans every month: a late payment for last month still waits.
  const queue = useCommunityContributions(isReviewer ? communityId : undefined, {
    status: 'pending',
    page_size: 100,
  });

  function done(message: string) {
    setNotice(message);
    setSelected(null);
  }

  if (list.data === undefined) {
    return list.isPending ? <LoadingState /> : <ErrorState message={errorMessage(list.error)} />;
  }
  const { summary, items, total } = list.data;
  const currency = summary.currency;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pending = (queue.data?.items ?? []).filter((row) => !rights.isOwn(row));
  const label = monthLabel(month);

  return (
    <div className="money-section">
      <div className="section-bar">
        <div>
          <h2 className="section-title">Contributions for {label}</h2>
          <p className="table__muted">
            What members owe and paid this month, and every payment they recorded.
          </p>
        </div>
        <div className="section-bar__actions">
          <Input
            label="Month"
            type="month"
            value={month}
            max={THIS_MONTH}
            onChange={(event) => {
              if (event.target.value) {
                setMonth(event.target.value);
                setPage(1);
              }
            }}
          />
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

      {notice && (
        <div className="notice notice--success" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">Done</p>
            <p className="notice__text">{notice}</p>
          </div>
        </div>
      )}

      <div className="stat-grid stat-grid--four">
        <StatCard
          label="Expected"
          value={<Money minor={summary.expected_minor} currency={currency} />}
          caption={`For ${label}, from every member's shares`}
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

      {isReviewer && pending.length > 0 && (
        <section className="card table-card" aria-labelledby="queue-title">
          <header className="table-card__head">
            <h2 id="queue-title" className="section-head__title">
              Waiting for your review <Badge tone="warning">{pending.length}</Badge>
            </h2>
            <p className="section-head__subtitle">
              Check each payment and its proof, then approve or reject it. The member is emailed
              either way.
            </p>
          </header>
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
                {pending.map((row) => (
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
        </section>
      )}

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

      <section className="card table-card" aria-labelledby="all-title">
        <header className="table-card__head">
          <h2 id="all-title" className="section-head__title">
            Payments for {label}
          </h2>
          <p className="section-head__subtitle">Read-only for members; open one for details.</p>
        </header>

        {items.length === 0 ? (
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
                  <th scope="col">Method</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__action-col">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
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
                      <td className="table__amount">
                        <Money minor={row.amount_minor} currency={row.currency} />
                      </td>
                      <td>
                        <MethodCell row={row} />
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
            Showing <strong>{items.length}</strong> of <strong>{total}</strong> payments
          </p>
          {pageCount > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button
                type="button"
                className="pagination__step"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <IconChevronLeft width={16} height={16} />
                Previous
              </button>
              <span className="table__muted">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                className="pagination__step"
                disabled={page === pageCount}
                onClick={() => setPage(page + 1)}
              >
                Next
                <IconChevronRight width={16} height={16} />
              </button>
            </nav>
          )}
        </footer>
      </section>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        label={selected ? `Payment by ${selected.member.full_name}` : 'Payment details'}
      >
        {selected && (
          <ContributionDrawerContent
            contribution={selected}
            showMember
            actions={(row) => <ReviewActions row={row} onDone={done} />}
          />
        )}
      </Drawer>

      <RemindersDialog
        open={reminding}
        month={month}
        monthLabel={label}
        onClose={() => setReminding(false)}
      />
    </div>
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
