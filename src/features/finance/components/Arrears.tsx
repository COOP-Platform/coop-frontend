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
  Select,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { useCommunityArrears, useMemberArrears, useMyArrears } from '../api/arrears';
import type { ArrearsMonth, ArrearsRow, MemberArrears, Period } from '../api/arrears';
import { formatAmount } from '../format';
import { periodLabel } from '../labels';
import { YEAR_OPTIONS } from '../year-options';
import { Money } from './Money';

/** What the "Status" filter on my unpaid months keeps. */
type MonthState = 'all' | 'unpaid' | 'partly' | 'waiting';

const MONTH_STATES: { value: MonthState; label: string }[] = [
  { value: 'all', label: 'All unpaid months' },
  { value: 'unpaid', label: 'Nothing paid yet' },
  { value: 'partly', label: 'Partly paid' },
  { value: 'waiting', label: 'Waiting for the Treasurer' },
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
  const [year, setYear] = useState('all');
  const [state, setState] = useState<MonthState>('all');

  const data = arrears.data;
  const hasMonths = (data?.months.length ?? 0) > 0;
  const filtering = year !== 'all' || state !== 'all';
  // The same years as My payments' Period, plus any older year still owed, newest first.
  const periodOptions = [
    { value: 'all', label: 'All years' },
    ...[
      ...YEAR_OPTIONS,
      ...(data?.years ?? [])
        .filter((y) => !YEAR_OPTIONS.some((o) => o.value === String(y.year)))
        .map((y) => ({ value: String(y.year), label: String(y.year) })),
    ].sort((a, b) => Number(b.value) - Number(a.value)),
  ];
  // A chosen year narrows everything, the "Still to pay" totals too; Status only the months.
  const inYear = data && scopeToYear(data, year);
  const shown: MemberArrears | undefined = inYear && {
    ...inYear,
    months: inYear.months.filter((m) => matchesState(m, state)),
  };

  return (
    <section className="card arrears" aria-labelledby="arrears-title">
      <header className="table-card__head my-contributions__head">
        <div>
          <h2 id="arrears-title" className="section-head__title">
            Ibirarane <span className="arrears__translation">(arrears)</span>
          </h2>
          <p className="section-head__subtitle">
            Months you still owe since you joined, oldest first. A payment for a month pays that
            month; an arrears payment pays the oldest month first.
          </p>
        </div>

        {data && (
          <div className="my-contributions__filters">
            <Select
              label="Period"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              options={periodOptions}
            />
            {hasMonths && (
              <Select
                label="Status"
                value={state}
                onChange={(event) => setState(event.target.value as MonthState)}
                options={MONTH_STATES}
              />
            )}
            {filtering && (
              <Button
                inline
                variant="tint"
                onClick={() => {
                  setYear('all');
                  setState('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}
      </header>
      {arrears.isPending ? (
        <LoadingState label="Working out what is left to pay…" />
      ) : arrears.error ? (
        <ErrorState title="Couldn't load your arrears" message={errorMessage(arrears.error)} />
      ) : (
        shown && (
          <ArrearsBody
            data={shown}
            onPay={onPay}
            who="you"
            scope={year === 'all' ? 'past months' : year}
          />
        )
      )}
    </section>
  );
}

/** Only one year's months, with the totals worked out for that year. */
function scopeToYear(data: MemberArrears, year: string): MemberArrears {
  if (year === 'all') return data;
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
      <div className="notice notice--success" role="status">
        <IconCheckCircle width={20} height={20} aria-hidden="true" />
        <div>
          <p className="notice__title">Nta birarane: up to date</p>
          <p className="notice__text">
            {who === 'you' ? 'You owe' : `${who} owes`} nothing for {scope}.
            {data.pending_minor > 0 &&
              ` ${formatAmount(data.pending_minor)} ${data.currency} is waiting for the Treasurer to confirm.`}
          </p>
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
          {plural(data.months_behind, 'month')} behind, since {since(data.oldest)}.
          {data.pending_minor > 0 && (
            <>
              {' '}
              {formatAmount(data.pending_minor)} {data.currency} recorded and waiting for the
              Treasurer.
            </>
          )}
        </p>
      </div>

      <div className="table-scroll">
        <table className="table arrears__table">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col" className="table__amount">
                Owed
              </th>
              <th scope="col" className="table__amount">
                Paid
              </th>
              <th scope="col" className="table__amount">
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
                  No months match these filters. Try another year or clear the filters.
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
            {year} · {formatAmount(remaining)} {currency} left
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
                {formatAmount(m.pending_minor)} awaiting
              </Badge>
            )}
          </td>
          <td className="table__amount">{formatAmount(m.owed_minor)}</td>
          <td className="table__amount">{formatAmount(m.paid_minor)}</td>
          <td className="table__amount arrears__left">{formatAmount(m.remaining_minor)}</td>
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

  if (arrears.isPending) return <LoadingState label="Working out who is behind…" />;
  if (arrears.error)
    return <ErrorState title="Couldn't load arrears" message={errorMessage(arrears.error)} />;
  const data = arrears.data;

  return (
    <div className="money-section">
      <section className="card arrears" aria-labelledby="community-arrears-title">
        <header className="table-card__head">
          <h2 id="community-arrears-title" className="section-head__title">
            Ibirarane <span className="arrears__translation">(arrears)</span>
          </h2>
          <p className="section-head__subtitle">
            Members who still owe for past months, every year included, most owed first.
          </p>
        </header>

        {data.items.length === 0 ? (
          <EmptyState
            icon={<IconCheckCircle width={28} height={28} />}
            title="Nta birarane: everyone is up to date"
            message={`All ${plural(data.active_members, 'paying member')} have paid every month so far.`}
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
                {data.members_behind} of {plural(data.active_members, 'paying member')} behind.
              </p>
            </div>
            <div className="table-scroll">
              <table className="table arrears__table">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Behind since</th>
                    <th scope="col">Months</th>
                    <th scope="col" className="table__amount">
                      Still to pay
                    </th>
                    <th scope="col" className="table__action-col">
                      <span className="visually-hidden">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.member.membership_id}>
                      <td>
                        {row.member.full_name}
                        {row.pending_minor > 0 && (
                          <Badge tone="warning">
                            {formatAmount(row.pending_minor)} awaiting review
                          </Badge>
                        )}
                      </td>
                      <td>{since(row.oldest)}</td>
                      <td>{row.months_behind}</td>
                      <td className="table__amount arrears__left">
                        {formatAmount(row.total_minor)}
                      </td>
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
      </section>

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
        <div>
          <p className="section-head__eyebrow">Ibirarane</p>
          <h2 id="member-arrears-title" className="section-head__title">
            {row.member.full_name}
          </h2>
          <p className="section-head__subtitle">Every month still owed, oldest first.</p>
        </div>
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
