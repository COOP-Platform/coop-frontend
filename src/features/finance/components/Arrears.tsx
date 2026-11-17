import { useState } from 'react';

import {
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconCheckCircle,
  IconClock,
  LoadingState,
  SectionCard,
  Select,
  TableFooter,
  usePaged,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { useCommunityArrears, useMemberArrears, useMyArrears } from '../api/arrears';
import type { ArrearsMonth, ArrearsRow, MemberArrears, Period } from '../api/arrears';
import { formatAmount } from '../format';
import { periodLabel } from '../labels';
import { THIS_YEAR, YEAR_OPTIONS } from '../year-options';
import { Money } from './Money';

/** What the "Status" filter on my unpaid months keeps. */
type MonthState = 'all' | 'unpaid' | 'partly' | 'waiting';

const MONTH_STATES: { value: MonthState; label: string }[] = [
  { value: 'all', label: 'All months' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partly', label: 'Partly paid' },
  { value: 'waiting', label: 'Pending' },
];

function matchesState(month: ArrearsMonth, state: MonthState): boolean {
  if (state === 'unpaid') return month.paid_minor === 0;
  if (state === 'partly') return month.paid_minor > 0;
  if (state === 'waiting') return month.pending_minor > 0;
  return true;
}

const since = (p: Period | null) => (p ? periodLabel(p.year, p.month) : '—');
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * My Contributions: "Ibirarane", every month I still owe, across years, with
 * a Pay button per month that opens the record form already filled in.
 */
export function MyArrears({ onPay }: { onPay?: (month: ArrearsMonth) => void }) {
  const { communityId } = useWorkspace();
  const arrears = useMyArrears(communityId);
  // Like My payments: one year at a time, this year first.
  const [year, setYear] = useState(String(THIS_YEAR));
  const [state, setState] = useState<MonthState>('all');

  const data = arrears.data;
  const hasMonths = (data?.months.length ?? 0) > 0;
  const filtering = state !== 'all';
  // The same years as My payments' Period, plus any older year still owed, newest first.
  const periodOptions = [
    ...YEAR_OPTIONS,
    ...(data?.years ?? [])
      .filter((y) => !YEAR_OPTIONS.some((o) => o.value === String(y.year)))
      .map((y) => ({ value: String(y.year), label: String(y.year) })),
  ].sort((a, b) => Number(b.value) - Number(a.value));
  // A chosen year narrows everything, the "Still to pay" totals too; Status only the months.
  const inYear = data && scopeToYear(data, year);
  const shown: MemberArrears | undefined = inYear && {
    ...inYear,
    months: inYear.months.filter((m) => matchesState(m, state)),
  };

  return (
    <SectionCard
      title="Ibirarane"
      flush
      actions={
        data && (
          <>
            <Select
              label="Year"
              labelHidden
              value={year}
              onChange={(event) => setYear(event.target.value)}
              options={periodOptions}
            />
            {hasMonths && (
              <Select
                label="Status"
                labelHidden
                value={state}
                onChange={(event) => setState(event.target.value as MonthState)}
                options={MONTH_STATES}
              />
            )}
            {filtering && (
              <Button inline variant="tint" onClick={() => setState('all')}>
                Clear
              </Button>
            )}
          </>
        )
      }
    >
      {arrears.isPending ? (
        <LoadingState label="Working out what is left to pay…" />
      ) : arrears.error ? (
        <ErrorState title="Couldn't load your arrears" message={errorMessage(arrears.error)} />
      ) : (
        shown && <ArrearsBody data={shown} onPay={onPay} who="you" scope={year} />
      )}
    </SectionCard>
  );
}

/** Only one year's months, with the totals worked out for that year. */
function scopeToYear(data: MemberArrears, year: string): MemberArrears {
  const months = data.months.filter((m) => String(m.year) === year);
  return {
    ...data,
    months,
    years: data.years.filter((y) => String(y.year) === year),
    total_minor: months.reduce((sum, m) => sum + m.remaining_minor, 0),
    pending_minor: months.reduce((sum, m) => sum + m.pending_minor, 0),
    months_behind: months.length,
    oldest: months[0] ? { year: months[0].year, month: months[0].month } : null,
  };
}

function ArrearsBody({
  data,
  onPay,
  who,
  scope = 'past months',
}: {
  data: MemberArrears;
  onPay?: (month: ArrearsMonth) => void;
  /** "you" on your own page, the member's first name for the Treasurer. */
  who: string;
  /** What "owes nothing for …" is about: past months, or one year. */
  scope?: string;
}) {
  if (data.total_minor === 0) {
    return (
      <div className="notice notice--success arrears__notice" role="status">
        <IconCheckCircle width={20} height={20} aria-hidden="true" />
        <div>
          <p className="notice__title">
            Nta birarane: {who === 'you' ? 'you owe' : `${who} owes`} nothing for {scope}
          </p>
          {data.pending_minor > 0 && (
            <p className="notice__text">
              {data.currency} {formatAmount(data.pending_minor)} pending
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="arrears__summary">
        <div>
          <p className="arrears__label">Still to pay</p>
          <p className="arrears__total">
            <Money minor={data.total_minor} currency={data.currency} />
          </p>
        </div>
        <p className="arrears__facts">
          {plural(data.months_behind, 'month')} behind, since {since(data.oldest)}
          {data.pending_minor > 0 && (
            <>
              {' · '}
              {data.currency} {formatAmount(data.pending_minor)} pending
            </>
          )}
        </p>
      </div>

      <div className="table-scroll">
        <table className="table arrears__table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col" className="num">
                Owed
              </th>
              <th scope="col" className="num">
                Paid
              </th>
              <th scope="col" className="num">
                Left
              </th>
              {onPay && (
                <th scope="col" className="table__action-col">
                  <span className="visually-hidden">Pay</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.months.length === 0 && (
              <tr>
                <td colSpan={onPay ? 5 : 4} className="table__muted">
                  No matching months
                </td>
              </tr>
            )}
            {data.years.map((year) => (
              <YearRows
                key={year.year}
                year={year.year}
                remaining={year.remaining_minor}
                months={data.months.filter((m) => m.year === year.year)}
                currency={data.currency}
                onPay={onPay}
                showYear={data.years.length > 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function YearRows({
  year,
  remaining,
  months,
  currency,
  onPay,
  showYear,
}: {
  year: number;
  remaining: number;
  months: ArrearsMonth[];
  currency: string;
  onPay?: (month: ArrearsMonth) => void;
  showYear: boolean;
}) {
  return (
    <>
      {showYear && (
        <tr className="arrears__year">
          <th scope="rowgroup" colSpan={onPay ? 5 : 4}>
            {year} · {currency} {formatAmount(remaining)} left
          </th>
        </tr>
      )}
      {months.map((m) => (
        <tr key={`${m.year}-${m.month}`}>
          <td>
            {periodLabel(m.year, m.month)}
            {m.pending_minor > 0 && (
              <Badge tone="warning">
                <IconClock width={12} height={12} aria-hidden="true" />{' '}
                {formatAmount(m.pending_minor)} pending
              </Badge>
            )}
          </td>
          <td className="num">{formatAmount(m.owed_minor)}</td>
          <td className="num">{formatAmount(m.paid_minor)}</td>
          <td className="num arrears__left">{formatAmount(m.remaining_minor)}</td>
          {onPay && (
            <td className="table__action-col">
              {m.record_as === null ? (
                <span className="table__muted">Ask the Treasurer</span>
              ) : (
                <button
                  type="button"
                  className="link-action"
                  onClick={() => onPay(m)}
                  aria-label={`Pay ${periodLabel(m.year, m.month)}`}
                >
                  Pay
                </button>
              )}
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

/**
 * Community Money, "Ibirarane" tab (whoever confirms payments): who is behind
 * and by how much, most owed first; a member opens their unpaid months.
 */
export function CommunityArrearsSection() {
  const { communityId } = useWorkspace();
  const arrears = useCommunityArrears(communityId);
  const [open, setOpen] = useState<ArrearsRow | null>(null);
  const paged = usePaged(arrears.data?.items ?? []);

  if (arrears.isPending) return <LoadingState label="Working out who is behind…" />;
  if (arrears.error)
    return <ErrorState title="Couldn't load arrears" message={errorMessage(arrears.error)} />;
  const data = arrears.data;

  return (
    <div className="money-section">
      <SectionCard
        title="Ibirarane"
        flush
        footer={
          data.items.length > 0 ? <TableFooter {...paged} onPage={paged.setPage} /> : undefined
        }
      >
        {data.items.length === 0 ? (
          <EmptyState
            icon={<IconCheckCircle width={28} height={28} />}
            title="Nta birarane: everyone is up to date"
          />
        ) : (
          <>
            <div className="arrears__summary">
              <div>
                <p className="arrears__label">Owed to the community</p>
                <p className="arrears__total">
                  <Money minor={data.total_minor} currency={data.currency} />
                </p>
              </div>
              <p className="arrears__facts">
                {data.members_behind} of {plural(data.active_members, 'member')} behind
              </p>
            </div>
            <div className="table-scroll">
              <table className="table arrears__table">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Since</th>
                    <th scope="col">Months</th>
                    <th scope="col" className="num">
                      Owed
                    </th>
                    <th scope="col" className="table__action-col">
                      <span className="visually-hidden">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((row) => (
                    <tr key={row.member.membership_id}>
                      <td>
                        {row.member.full_name}
                        {row.pending_minor > 0 && (
                          <Badge tone="warning">{formatAmount(row.pending_minor)} pending</Badge>
                        )}
                      </td>
                      <td>{since(row.oldest)}</td>
                      <td>{row.months_behind}</td>
                      <td className="num arrears__left">{formatAmount(row.total_minor)}</td>
                      <td className="table__action-col">
                        <Button inline variant="secondary" onClick={() => setOpen(row)}>
                          See months
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </SectionCard>

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        label={open ? `Arrears of ${open.member.full_name}` : 'Arrears'}
      >
        {open && <MemberArrearsDetails row={open} />}
      </Drawer>
    </div>
  );
}

function MemberArrearsDetails({ row }: { row: ArrearsRow }) {
  const { communityId } = useWorkspace();
  const arrears = useMemberArrears(communityId, row.member.membership_id);
  const firstName = row.member.full_name.split(' ')[0] ?? row.member.full_name;

  return (
    <section className="details" aria-labelledby="member-arrears-title">
      <header className="details__head">
        <h2 id="member-arrears-title" className="section-head__title">
          {row.member.full_name}
        </h2>
      </header>
      {arrears.isPending ? (
        <LoadingState label="Loading months…" />
      ) : arrears.error ? (
        <ErrorState title="Couldn't load the months" message={errorMessage(arrears.error)} />
      ) : (
        <ArrearsBody data={arrears.data} who={firstName} />
      )}
    </section>
  );
}
