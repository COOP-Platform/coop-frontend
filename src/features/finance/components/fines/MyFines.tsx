import { Badge, ErrorState } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { useMyFines } from '../../api/fines';
import type { Fine } from '../../api/fines';
import { formatAmount } from '../../format';
import { Money } from '../Money';
import { fineSentence, fineStatus, leftToRecord } from './fine-text';

/**
 * My Contributions, "My fines": only shown when the member has any. Each
 * fine with what is paid and left, and a Pay button that opens the record
 * form for that fine.
 */
export function MyFines({ onPay }: { onPay?: (fine: Fine) => void }) {
  const { communityId } = useWorkspace();
  const fines = useMyFines(communityId);

  // Loading quietly: most members have no fines, so no placeholder flashes.
  if (fines.isPending) return null;
  if (fines.error)
    return <ErrorState title="Couldn't load your fines" message={errorMessage(fines.error)} />;
  const { items, total_outstanding_minor: owed } = fines.data;
  if (items.length === 0) return null;
  const currency = items[0]?.currency ?? 'RWF';

  return (
    <section className="card fines" aria-labelledby="my-fines-title">
      <header className="table-card__head">
        <h2 id="my-fines-title" className="section-head__title">
          My fines
        </h2>
        <p className="section-head__subtitle">
          {owed > 0
            ? `You still have ${formatAmount(owed)} ${currency} of fines to pay. A fine payment counts once the Treasurer confirms it.`
            : 'All your fines are paid or waived.'}
        </p>
      </header>

      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Fine</th>
              <th scope="col" className="table__amount">
                Paid
              </th>
              <th scope="col" className="table__amount">
                Left
              </th>
              <th scope="col">Status</th>
              {onPay && (
                <th scope="col" className="table__action-col">
                  <span className="visually-hidden">Pay</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((fine) => {
              const status = fineStatus(fine);
              const toPay = leftToRecord(fine);
              return (
                <tr key={fine.id}>
                  <td>
                    <span className="table__stack">
                      <span>{fineSentence(fine)}</span>
                      <span className="table__muted">
                        {fine.kind !== 'other' && `${fine.reason} · `}Issued{' '}
                        {formatDate(fine.created_at)}
                        {fine.status === 'waived' && fine.waive_reason
                          ? ` · waived: ${fine.waive_reason}`
                          : ''}
                      </span>
                    </span>
                  </td>
                  <td className="table__amount">{formatAmount(fine.paid_minor)}</td>
                  <td className="table__amount">
                    <Money minor={fine.outstanding_minor} currency={fine.currency} />
                  </td>
                  <td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {fine.pending_minor > 0 && toPay > 0 && (
                      <span className="fines__note">
                        {formatAmount(fine.pending_minor)} waiting for the Treasurer
                      </span>
                    )}
                  </td>
                  {onPay && (
                    <td className="table__action-col">
                      {fine.status === 'issued' && toPay > 0 && (
                        <button
                          type="button"
                          className="link-action"
                          onClick={() => onPay(fine)}
                          aria-label={`Pay: ${fineSentence(fine)}`}
                        >
                          Pay
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
