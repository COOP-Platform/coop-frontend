import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { Badge, Button, IconCheckCircle, Textarea } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  useConfirmPaymentReview,
  usePreviewPaymentReview,
  useRejectPaymentReview,
} from '../api/email-review';
import type { ContributionDetail } from '../api/my-contributions';
import { formatAmount } from '../format';
import { METHOD_LABEL, NO_METHOD, STATUS_LABEL, TYPE_LABEL, periodLabel } from '../labels';

export type ReviewAction = 'approve' | 'reject';

interface PaymentReviewProps {
  /** From `#token=` on the emailed link. */
  token?: string;
  /** Which button in the email was pressed. */
  action: ReviewAction;
}

function Message({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="login-form">
      <div className="login-form__head">
        <h1 className="login-form__title">{title}</h1>
        <p className="login-form__subtitle">{children}</p>
      </div>
      {action}
    </div>
  );
}

const signIn = (
  <Link to="/login" className="btn btn--primary">
    Sign in to COOP
  </Link>
);

/**
 * The page behind the Approve / Reject buttons in the Treasurer's email.
 * Opening it decides nothing: the reviewer sees the payment and its proof,
 * then presses the button here (a reason is required to reject).
 */
export function PaymentReview({ token, action: initialAction }: PaymentReviewProps) {
  const preview = usePreviewPaymentReview();
  const confirm = useConfirmPaymentReview();
  const reject = useRejectPaymentReview();
  const [action, setAction] = useState<ReviewAction>(initialAction);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>(undefined);
  const [decided, setDecided] = useState<ContributionDetail | null>(null);

  const { mutate: runPreview, isIdle } = preview;
  useEffect(() => {
    if (token !== undefined && isIdle) runPreview(token);
  }, [token, isIdle, runPreview]);

  if (token === undefined) {
    return (
      <Message title="This link is incomplete" action={signIn}>
        Open the button in the email again, or sign in and review the payment in COOP.
      </Message>
    );
  }

  if (preview.isPending || preview.isIdle) {
    return <Message title="Opening the payment…">One moment.</Message>;
  }

  if (preview.error || preview.data === undefined) {
    const gone = preview.error instanceof ApiError && preview.error.status === 410;
    return (
      <Message title={gone ? 'This link no longer works' : 'Something went wrong'} action={signIn}>
        {errorMessage(preview.error)}
      </Message>
    );
  }

  const { community, reviewer } = preview.data;
  const payment = decided ?? preview.data.contribution;

  if (decided) {
    const approved = decided.status === 'confirmed';
    return (
      <Message title={approved ? 'Payment approved' : 'Payment rejected'} action={signIn}>
        {formatAmount(decided.amount_minor)} {decided.currency} from {decided.member.full_name} is
        now {approved ? 'confirmed and counts in the totals' : 'rejected'}.{' '}
        {decided.member.full_name} has been emailed
        {approved ? ' and can download the receipt.' : ' the reason.'}
      </Message>
    );
  }

  const busy = confirm.isPending || reject.isPending;
  const failure = confirm.error ?? reject.error;
  const canDecide = preview.data.can_confirm || preview.data.can_reject;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (token === undefined) return;
    if (action === 'approve') {
      confirm.mutate(token, { onSuccess: setDecided });
      return;
    }
    if (reason.trim() === '') {
      setReasonError('Tell the member why, so they can fix it and record the payment again.');
      return;
    }
    setReasonError(undefined);
    reject.mutate(
      { token, reason: reason.trim() },
      {
        onSuccess: setDecided,
        onError: (error) => {
          if (error instanceof ApiError && error.fieldErrors.reason)
            setReasonError(error.fieldErrors.reason);
        },
      },
    );
  }

  const status = STATUS_LABEL[payment.status];
  const method = payment.payment_method ? METHOD_LABEL[payment.payment_method] : NO_METHOD;
  const purpose =
    payment.contribution_type === 'dedicated' && payment.campaign
      ? `${TYPE_LABEL.dedicated}: ${payment.campaign.title}`
      : TYPE_LABEL[payment.contribution_type];

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-form__head">
        <h1 className="login-form__title">Review payment</h1>
        <p className="login-form__subtitle">
          {community.name} · reviewing as {reviewer.full_name}
        </p>
      </div>

      <dl className="details__list review-payment">
        <div>
          <dt>Member</dt>
          <dd>{payment.member.full_name}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd>
            <strong>
              {formatAmount(payment.amount_minor)} {payment.currency}
            </strong>
          </dd>
        </div>
        <div>
          <dt>For</dt>
          <dd>
            {purpose} · {periodLabel(payment.period_year, payment.period_month)}
          </dd>
        </div>
        <div>
          <dt>Paid on</dt>
          <dd>{formatDate(payment.paid_at)}</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>{method.label}</dd>
        </div>
        {payment.payment_reference && (
          <div>
            <dt>Reference</dt>
            <dd className="mono">{payment.payment_reference}</dd>
          </div>
        )}
        <div>
          <dt>Proof</dt>
          <dd>
            {payment.proofs && payment.proofs.length > 0
              ? payment.proofs.map((proof) =>
                  proof.url ? (
                    <a key={proof.id} href={proof.url} target="_blank" rel="noreferrer">
                      {proof.file_name}
                    </a>
                  ) : (
                    <span key={proof.id}>{proof.file_name}</span>
                  ),
                )
              : 'None attached'}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <Badge tone={status.tone}>{status.label}</Badge>
          </dd>
        </div>
      </dl>

      {!canDecide ? (
        <p className="form-error">{preview.data.blocked_reason}</p>
      ) : (
        <>
          {action === 'reject' && (
            <Textarea
              label="Reason for rejecting"
              placeholder="e.g. The amount on the MoMo screenshot does not match."
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              error={reasonError}
              required
            />
          )}

          {failure && !reasonError && <p className="form-error">{errorMessage(failure)}</p>}

          {action === 'approve' ? (
            <Button
              type="submit"
              icon={<IconCheckCircle />}
              disabled={busy || !preview.data.can_confirm}
            >
              {confirm.isPending ? 'Approving…' : 'Approve payment'}
            </Button>
          ) : (
            <Button type="submit" variant="danger" disabled={busy || !preview.data.can_reject}>
              {reject.isPending ? 'Rejecting…' : 'Reject payment'}
            </Button>
          )}

          <button
            type="button"
            className="link-action review-payment__switch"
            onClick={() => {
              setAction(action === 'approve' ? 'reject' : 'approve');
              setReasonError(undefined);
            }}
          >
            {action === 'approve' ? 'Reject it instead' : 'Approve it instead'}
          </button>
        </>
      )}
    </form>
  );
}
