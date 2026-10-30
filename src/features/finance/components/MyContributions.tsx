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

import { useMyContributions } from '../api/my-contributions';
import type { MyContribution } from '../api/my-contributions';
import { METHOD_LABEL, STATUS_LABEL } from '../labels';
import { ContributionDrawerContent } from './ContributionDrawer';
import { Money } from './Money';

const THIS_YEAR = new Date().getFullYear();
/** Past years to pick from, newest first. */
const PAST_YEARS = 4;
/** Years ahead are listed too, but cannot be chosen — nothing exists there yet. */
const FUTURE_YEARS = 2;
const YEAR_OPTIONS = Array.from({ length: PAST_YEARS + FUTURE_YEARS + 1 }, (_, i) => {
  const value = THIS_YEAR + FUTURE_YEARS - i;
  return {
    value: String(value),
    label: value === THIS_YEAR ? `This Year (${value})` : String(value),
    disabled: value > THIS_YEAR,
  };
});

export function MyContributions() {
  const { communityId } = useWorkspace();
  const [year, setYear] = useState(THIS_YEAR);
  const [selected, setSelected] = useState<MyContribution | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const { data, isSample, isPending, error } = useMyContributions(communityId, year);

  // "Contact your treasurer" names whoever holds that seat, when there is one.
  const committee = useCommittee(communityId);
  const treasurer = (committee.data ?? [])
    .find((seat) => /treasur/i.test(seat.name))
    ?.holders.map((holder) => holder.full_name)
    .join(', ');

  async function downloadStatement() {
    setStatementError(null);
    setPreparing(true);
    try {
      await apiDownload(`/me/statement.pdf?year=${year}`, `statement-${year}.pdf`);
    } catch (error) {
      setStatementError(errorMessage(error));
    } finally {
      setPreparing(false);
    }
  }

  if (data === undefined) {
    return isPending ? <LoadingState /> : <ErrorState message={errorMessage(error)} />;
  }
  const { summary, items } = data;

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <span className="eyebrow eyebrow--muted">
            Personal Portal
            {isSample && <Badge tone="warning">Sample figures</Badge>}
          </span>
        }
        title="My Contributions"
        subtitle="View your contribution history."
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
              disabled={isSample || preparing}
              title={isSample ? 'Statements arrive with the finance API' : undefined}
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
          value={<Money value={summary.total_contributed} />}
          caption={`${summary.count} installment${summary.count === 1 ? '' : 's'} paid in ${year}`}
          icon={<IconWallet />}
          tone="brand"
        />
        <StatCard
          variant="tint"
          label="Number of Contributions"
          value={summary.count}
          caption={`${Math.round(summary.on_time_rate)}% on-time settlement`}
          icon={<IconBadgeCheck />}
          tone="info"
        />
        <StatCard
          variant="tint"
          label="Outstanding Amount"
          value={<Money value={summary.outstanding} />}
          caption={summary.outstanding === 0 ? 'All dues cleared' : 'Still to be paid'}
          icon={<IconCheckCircle />}
          tone={summary.outstanding === 0 ? 'brand' : 'warning'}
          emphasis={summary.outstanding > 0}
        />
      </div>

      <section className="card table-card" aria-labelledby="history-title">
        <header className="table-card__head">
          <h2 id="history-title" className="section-head__title">
            Contribution History
          </h2>
          <p className="section-head__subtitle">
            Verified ledger entries credited to your account.
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
                  const method = METHOD_LABEL[item.method];
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
                      <td>{formatDate(item.paid_on)}</td>
                      <td className="table__amount">
                        <Money value={item.amount} />
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
            ? `Contribution details, ${formatDate(selected.paid_on)}`
            : 'Contribution details'
        }
      >
        {selected && <ContributionDrawerContent contribution={selected} isSample={isSample} />}
      </Drawer>
    </div>
  );
}
