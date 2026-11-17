import { Badge, ErrorState, Pagination, SectionCard, usePaged } from '@/components/ui';
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
  const paged = usePaged(fines.data?.items ?? []);

  // Loading quietly: most members have no fines, so no placeholder flashes.
  if (fines.isPending) return null;
  if (fines.error)
    return <ErrorState title="Couldn't load your fines" message={errorMessage(fines.error)} />;
  const { items, total_outstanding_minor: owed } = fines.data;
  if (items.length === 0) return null;
  const currency = items[0]?.currency ?? 'RWF';

  return (
    <SectionCard
      title="My fines"
      flush
      footer={
        <>
          <span>
            {owed > 0 ? `${currency} ${formatAmount(owed)} to pay` : 'All paid or waived'}
          </span>
          {paged.pageCount > 1 && (
            <Pagination page={paged.page} pageCount={paged.pageCount} onPage={paged.setPage} />
          )}
        </>
      }
    >
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Fine</th>
              <th scope="col" className="num">
                Paid
              </th>
              <th scope="col" className="num">
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
            {paged.rows.map((fine) => {
              const status = fineStatus(fine);
              const toPay = leftToRecord(fine);
              return (
                <tr key={fine.id}>
                  <td>
                    <span className="table__stack">
                      <span>{fineSentence(fine)}</span>
                      <span className="table__muted">
                        {fine.kind !== 'other' && `${fine.reason} · `}
                        {formatDate(fine.created_at)}
                        {fine.status === 'waived' && fine.waive_reason
                          ? ` · waived: ${fine.waive_reason}`
                          : ''}
                      </span>
                    </span>
                  </td>
                  <td className="num">{formatAmount(fine.paid_minor)}</td>
                  <td className="num">
                    <Money minor={fine.outstanding_minor} currency={fine.currency} />
                  </td>
                  <td>
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {fine.pending_minor > 0 && toPay > 0 && (
                      <span className="fines__note">
                        {formatAmount(fine.pending_minor)} pending
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
    </SectionCard>
  );
}
