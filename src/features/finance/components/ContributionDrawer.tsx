import { useState } from 'react';
import type { ReactNode } from 'react';

import { Badge, Button, IconDownload, IconInfoCircle } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import { receiptPath, useContributionDetail } from '../api/my-contributions';
import type { Contribution } from '../api/my-contributions';
import { METHOD_LABEL, NO_METHOD, STATUS_LABEL, TYPE_LABEL, periodLabel } from '../labels';
import { Money } from './Money';

interface ContributionDrawerContentProps {
  contribution: Contribution;
  /** On the community list: say whose payment it is. */
  showMember?: boolean;
  /** The Treasurer's buttons, given the freshest copy of the payment. */
  actions?: (row: Contribution) => ReactNode;
}

/** Everything about one payment: the list row at once, the review trail once it loads. */
export function ContributionDrawerContent({
  contribution,
  showMember = false,
  actions,
}: ContributionDrawerContentProps) {
  const { communityId } = useWorkspace();
  const detail = useContributionDetail(communityId, contribution.id);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // The detail answer is fresher than the list row; use it once it is in.
  const row = detail.data ?? contribution;
  const status = STATUS_LABEL[row.status];
  const method = row.payment_method ? METHOD_LABEL[row.payment_method] : NO_METHOD;
  const history = detail.data?.history ?? [];
  const proofs = detail.data?.proofs;

  async function downloadReceipt() {
    if (communityId === undefined) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await apiDownload(receiptPath(communityId, row.id), `receipt-${row.id}.pdf`);
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  }

  const purpose =
    row.contribution_type === 'dedicated' && row.campaign
      ? `${TYPE_LABEL.dedicated}: ${row.campaign.title}`
      : TYPE_LABEL[row.contribution_type];

  return (
    <section className="details" aria-labelledby="contribution-details-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">Contribution</p>
          <h2 id="contribution-details-title" className="section-head__title">
            Contribution Details
          </h2>
          <p className="section-head__subtitle">{formatLongDate(row.paid_at)}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>

      <div className="details__person">
        {showMember && (
          <div className="table__stack">
            <span className="table__muted">Member</span>
            <span className="details__name">{row.member.full_name}</span>
            <span className="table__muted">{row.member_category.name}</span>
          </div>
        )}
        <div className="table__stack">
          <span className="table__muted">Amount</span>
          <span className="details__name">
            <Money minor={row.amount_minor} currency={row.currency} />
          </span>
        </div>
      </div>

      <dl className="details__list">
        <div>
          <dt>Purpose</dt>
          <dd>{purpose}</dd>
        </div>
        <div>
          <dt>Covers</dt>
          <dd>{periodLabel(row.period_year, row.period_month)}</dd>
        </div>
        <div>
          <dt>Payment channel</dt>
          <dd>
            <span className={`channel-dot channel-dot--${method.tone}`} aria-hidden="true" />
            {method.label}
          </dd>
        </div>
        {row.payment_reference && (
          <div>
            <dt>Reference</dt>
            <dd className="mono">{row.payment_reference}</dd>
          </div>
        )}
        <div>
          <dt>Recorded by</dt>
          <dd>
            {row.recorded_by.full_name} · {formatDate(row.created_at)}
          </dd>
        </div>
        {row.confirmed_by && row.confirmed_at && (
          <div>
            <dt>Confirmed by</dt>
            <dd>
              {row.confirmed_by.full_name} · {formatDate(row.confirmed_at)}
            </dd>
          </div>
        )}
        {row.rejected_by && row.rejected_at && (
          <div>
            <dt>Rejected by</dt>
            <dd>
              {row.rejected_by.full_name} · {formatDate(row.rejected_at)}
            </dd>
          </div>
        )}
        {row.proof_count > 0 && (
          <div>
            <dt>Proof</dt>
            <dd>
              {proofs
                ? proofs.map((proof) =>
                    proof.url ? (
                      <a key={proof.id} href={proof.url} target="_blank" rel="noreferrer">
                        {proof.file_name}
                      </a>
                    ) : (
                      <span key={proof.id}>{proof.file_name}</span>
                    ),
                  )
                : `${row.proof_count} file${row.proof_count === 1 ? '' : 's'}`}
            </dd>
          </div>
        )}
      </dl>

      {row.rejection_reason && (
        <p className="details__note" role="note">
          <strong>Reason:</strong> {row.rejection_reason}
        </p>
      )}
      {row.reversal && (
        <p className="details__note" role="note">
          <strong>Reversed:</strong> {row.reversal.reason}
        </p>
      )}

      {history.length > 0 && (
        <div>
          <h3 className="details__subhead">Status history</h3>
          <ol className="history" role="list">
            {history.map((entry) => (
              <li key={`${entry.status}-${entry.at}`} className="history__item">
                <Badge tone={STATUS_LABEL[entry.status].tone}>
                  {STATUS_LABEL[entry.status].label}
                </Badge>
                <span className="table__muted">
                  {entry.by ? `${entry.by.full_name} · ` : ''}
                  {formatDate(entry.at)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {detail.isPending && (
        <p className="table__muted" role="status">
          Loading the review trail…
        </p>
      )}
      {detail.error && (
        <p className="table__warn" role="alert">
          {errorMessage(detail.error)}
        </p>
      )}

      {actions?.(row)}

      <div className="details__actions">
        {row.status === 'confirmed' ? (
          <Button
            inline
            icon={<IconDownload />}
            disabled={downloading}
            onClick={() => void downloadReceipt()}
          >
            {downloading ? 'Preparing…' : 'Download receipt'}
          </Button>
        ) : (
          <p className="details__note">
            <IconInfoCircle width={16} height={16} aria-hidden="true" /> A receipt is available once
            the Treasurer has confirmed the payment.
          </p>
        )}
        {downloadError && (
          <p className="table__warn" role="alert">
            {downloadError}
          </p>
        )}
      </div>
    </section>
  );
}
