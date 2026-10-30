import { useState } from 'react';

import { Badge, Button, IconDownload, IconInfoCircle } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import { useContributionDetail } from '../api/my-contributions';
import type { MyContribution } from '../api/my-contributions';
import { METHOD_LABEL, PURPOSE_LABEL, STATUS_LABEL } from '../labels';
import { Money } from './Money';

interface ContributionDrawerContentProps {
  contribution: MyContribution;
  /** Sample rows have no server record to load or download. */
  isSample: boolean;
}

/** Everything about one payment: the list row at once, the review trail once it loads. */
export function ContributionDrawerContent({
  contribution,
  isSample,
}: ContributionDrawerContentProps) {
  const { communityId } = useWorkspace();
  const detail = useContributionDetail(communityId, contribution.id, !isSample);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const status = STATUS_LABEL[contribution.status];
  const method = METHOD_LABEL[contribution.method];
  const full = detail.data;

  async function downloadReceipt() {
    setDownloadError(null);
    setDownloading(true);
    try {
      await apiDownload(
        `/contributions/${contribution.id}/receipt.pdf`,
        `receipt-${contribution.id}.pdf`,
      );
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="details" aria-labelledby="contribution-details-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">Contribution</p>
          <h2 id="contribution-details-title" className="section-head__title">
            Contribution Details
          </h2>
          <p className="section-head__subtitle">{formatLongDate(contribution.paid_on)}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </header>

      <div className="details__person">
        <div className="table__stack">
          <span className="table__muted">Amount</span>
          <span className="details__name">
            <Money value={contribution.amount} />
          </span>
        </div>
      </div>

      <dl className="details__list">
        <div>
          <dt>Purpose</dt>
          <dd>{PURPOSE_LABEL[contribution.purpose]}</dd>
        </div>
        <div>
          <dt>Payment channel</dt>
          <dd>
            <span className={`channel-dot channel-dot--${method.tone}`} aria-hidden="true" />
            {method.label}
          </dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd className="mono">{contribution.reference}</dd>
        </div>
        <div>
          <dt>Paid on</dt>
          <dd>{formatDate(contribution.paid_on)}</dd>
        </div>
        {full?.reviewed_by && full.reviewed_at && (
          <div>
            <dt>{full.status === 'REJECTED' ? 'Rejected by' : 'Confirmed by'}</dt>
            <dd>
              {full.reviewed_by.name} · {formatDate(full.reviewed_at)}
            </dd>
          </div>
        )}
      </dl>

      {full?.reject_reason && (
        <p className="details__note" role="note">
          <strong>Reason:</strong> {full.reject_reason}
        </p>
      )}
      {full?.reversal && (
        <p className="details__note" role="note">
          <strong>Reversed:</strong> {full.reversal.reason}
        </p>
      )}

      {full && full.history.length > 0 && (
        <div>
          <h3 className="details__subhead">Status history</h3>
          <ol className="history" role="list">
            {full.history.map((entry) => (
              <li key={`${entry.status}-${entry.at}`} className="history__item">
                <Badge tone={STATUS_LABEL[entry.status].tone}>
                  {STATUS_LABEL[entry.status].label}
                </Badge>
                <span className="table__muted">
                  {entry.by.name} · {formatDate(entry.at)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {detail.isPending && !isSample && (
        <p className="table__muted" role="status">
          Loading the review trail…
        </p>
      )}
      {detail.error && !isSample && (
        <p className="table__warn" role="alert">
          {errorMessage(detail.error)}
        </p>
      )}

      <div className="details__actions">
        {contribution.status === 'PAID' ? (
          <Button
            inline
            icon={<IconDownload />}
            disabled={isSample || downloading}
            title={isSample ? 'Receipts arrive with the finance API' : undefined}
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
