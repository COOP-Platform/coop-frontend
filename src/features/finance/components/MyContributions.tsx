import { useState } from 'react';

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
  IconWallet,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useCommittee } from '@/features/positions';
import { apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { statementPath, useMyContributions } from '../api/my-contributions';
import type { Contribution } from '../api/my-contributions';
import { formatAmount } from '../format';
import { METHOD_LABEL, NO_METHOD, STATUS_LABEL } from '../labels';
import { ContributionDrawerContent } from './ContributionDrawer';
import { Money } from './Money';

const THIS_YEAR = new Date().getFullYear();
/** Past years to pick from, newest first. The backend refuses years before 2020. */
const PAST_YEARS = Math.min(4, THIS_YEAR - 2020);
const YEAR_OPTIONS = Array.from({ length: PAST_YEARS + 1 }, (_, i) => {
  const value = THIS_YEAR - i;
  return {
    value: String(value),
    label: value === THIS_YEAR ? `This Year (${value})` : String(value),
  };
});

export function MyContributions() {
  const { communityId } = useWorkspace();
  const [year, setYear] = useState(THIS_YEAR);
  const [selected, setSelected] = useState<Contribution | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const { data, isPending, error } = useMyContributions(communityId, year);

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
  const { summary, shares, items } = data;
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
            <Select
              label="Period"
              value={String(year)}
              onChange={(event) => setYear(Number(event.target.value))}
              options={YEAR_OPTIONS}
            />
            <Button
              inline
              icon={<IconDownload />}
              disabled={preparing}
              onClick={() => void downloadStatement()}
            >
              {preparing ? 'Preparing…' : 'Download Statement (PDF)'}
            </Button>
          </>
        }
      />

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

      <section className="card table-card" aria-labelledby="history-title">
        <header className="table-card__head">
          <h2 id="history-title" className="section-head__title">
            Contribution History
          </h2>
          <p className="section-head__subtitle">
            Every payment recorded for you, with its review status.
          </p>
        </header>

        {items.length === 0 ? (
          <EmptyState
            icon={<IconWallet width={28} height={28} />}
            title={`No contributions in ${year}`}
            message="Payments you record and the Treasurer confirms will show here."
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Payment type</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__action-col">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
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
    </div>
  );
}
