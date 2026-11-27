import { Badge } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { formatDate, formatLongDate } from '@/lib/format/date';

import { useContributionDetail } from '../api/my-contributions';
import type { Contribution } from '../api/my-contributions';
import { formatAmount } from '../format';
import { METHOD_LABEL, NO_METHOD, TYPE_LABEL, periodLabel } from '../labels';
import { coversLabel } from '../payment-groups';
import { Money } from './Money';
import { PaymentGroupActions } from './PaymentGroupActions';

/** Plain words for what each month was paid as. */
const AS_LABEL: Partial<Record<Contribution['contribution_type'], string>> = {
  arrears: 'Unpaid month',
  monthly: 'Monthly',
};

/**
 * One payment request, in one place, as the Treasurer received it: who paid,
 * the whole amount, how and where, the proof, and the months the system
 * assigned it to (oldest unpaid first, then ahead). One Approve or Reject
 * decides all of it.
 */
export function PaymentRequest({
  rows,
  onDone,
}: {
  rows: readonly Contribution[];
  onDone: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const first = rows[0];
  // Every month of one payment shares the same proof: read it from the first.
  const detail = useContributionDetail(communityId, first?.id);
  if (!first) return null;

  const total = rows.reduce((sum, r) => sum + r.amount_minor, 0);
  const method = first.payment_method ? METHOD_LABEL[first.payment_method] : NO_METHOD;
  const proofs = detail.data?.proofs ?? null;

  return (
    <section className="details" aria-labelledby="payment-request-title">
      <header className="details__head">
        <div>
          <h2 id="payment-request-title" className="section-head__title">
            Payment request
          </h2>
          <p className="section-head__subtitle">{formatLongDate(first.paid_at)}</p>
        </div>
        <Badge tone="warning">Pending review</Badge>
      </header>

      <div className="details__person">
        <div className="table__stack">
          <span className="table__muted">Member</span>
          <span className="details__name">{first.member.full_name}</span>
          <span className="table__muted">{first.member_category.name}</span>
        </div>
        <div className="table__stack">
          <span className="table__muted">Amount paid</span>
          <span className="details__name">
            <Money minor={total} currency={first.currency} />
          </span>
        </div>
      </div>

      <dl className="details__list">
        <div>
          <dt>Covers</dt>
          <dd>{coversLabel(rows)}</dd>
        </div>
        <div>
          <dt>Paid by</dt>
          <dd>
            <span className={`channel-dot channel-dot--${method.tone}`} aria-hidden="true" />
            {method.label}
          </dd>
        </div>
        {first.account && (
          <div>
            <dt>Paid into</dt>
            <dd>
              {first.account.name}
              {first.account.number && <span className="mono"> · {first.account.number}</span>}
            </dd>
          </div>
        )}
        {first.payment_reference && (
          <div>
            <dt>Reference</dt>
            <dd className="mono">{first.payment_reference}</dd>
          </div>
        )}
        <div>
          <dt>Recorded by</dt>
          <dd>
            {first.recorded_by.full_name} · {formatDate(first.created_at)}
          </dd>
        </div>
      </dl>

      <div>
        <h3 className="details__subhead">Proof</h3>
        {first.proof_count === 0 ? (
          <p className="table__muted">No proof attached.</p>
        ) : proofs === null ? (
          <p className="table__muted">Loading the proof…</p>
        ) : (
          <ul className="payment-request__proofs" role="list">
            {proofs.map((proof) => (
              <li key={proof.id}>
                {proof.url && proof.mime_type.startsWith('image/') && (
                  <a href={proof.url} target="_blank" rel="noreferrer">
                    <img src={proof.url} alt={`Proof: ${proof.file_name}`} />
                  </a>
                )}
                {proof.url ? (
                  <a href={proof.url} target="_blank" rel="noreferrer">
                    Open {proof.file_name}
                  </a>
                ) : (
                  <span>{proof.file_name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="details__subhead">What it pays for</h3>
        <table className="table table--compact">
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">As</th>
              <th scope="col" className="num">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.contribution_type === 'dedicated' && row.campaign
                    ? row.campaign.title
                    : periodLabel(row.period_year, row.period_month)}
                </td>
                <td className="table__muted">
                  {AS_LABEL[row.contribution_type] ?? TYPE_LABEL[row.contribution_type]}
                </td>
                <td className="num">{formatAmount(row.amount_minor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Total
              </th>
              <td className="num">
                <Money minor={total} currency={first.currency} />
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="table__muted">
          Assigned automatically: oldest unpaid months first, then the months ahead.
        </p>
      </div>

      <PaymentGroupActions rows={rows} onDone={onDone} />
    </section>
  );
}
