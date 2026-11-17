import { EmptyState, ErrorState, LoadingState, TableFooter, usePaged } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import type { Campaign } from '../api/budgets';
import { useCommunityContributions } from '../api/contributions';
import { formatAmount } from '../format';
import { Money } from './Money';

/**
 * The money paid into one dedicated contribution: who paid, how much and
 * when, newest first, with the total. Paid (confirmed) payments only, as
 * every member sees them.
 */
export function CampaignPayments({ campaign }: { campaign: Campaign }) {
  const { communityId } = useWorkspace();
  const payments = useCommunityContributions(communityId, {
    campaign: campaign.id,
    status: 'confirmed',
    page_size: 100,
  });
  const rows = payments.data?.items ?? [];
  const paged = usePaged(rows);
  const total = rows.reduce((sum, row) => sum + row.amount_minor, 0);

  return (
    <section className="details" aria-labelledby="campaign-payments-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">Dedicated contribution</p>
          <h2 id="campaign-payments-title" className="section-head__title">
            {campaign.title}
          </h2>
        </div>
      </header>

      {payments.isPending ? (
        <LoadingState label="Loading payments…" />
      ) : payments.error ? (
        <ErrorState title="Couldn't load the payments" message={errorMessage(payments.error)} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nobody has paid yet" size="sm" />
      ) : (
        <>
          <p className="details__note">
            {rows.length} payment{rows.length === 1 ? '' : 's'} ·{' '}
            <strong>
              {formatAmount(total)} {campaign.currency}
            </strong>{' '}
            paid
          </p>
          <div className="table-scroll">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.member.full_name}</td>
                    <td>{formatDate(row.paid_at)}</td>
                    <td className="num">
                      <Money minor={row.amount_minor} currency={row.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2}>
                    Total
                  </th>
                  <td className="num">
                    <Money minor={total} currency={campaign.currency} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {rows.length > 10 && <TableFooter {...paged} onPage={paged.setPage} />}
        </>
      )}
    </section>
  );
}
