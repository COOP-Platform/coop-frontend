import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  Dialog,
  IconBan,
  IconBellAlert,
  IconCheckCircle,
  IconHistory,
  IconTile,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import {
  useConfirmContribution,
  useRejectContribution,
  useReverseContribution,
  useSendReminders,
} from '../api/contributions';
import type { ReminderResult } from '../api/contributions';
import type { Contribution } from '../api/my-contributions';
import { formatAmount } from '../format';
import { useReviewRights } from '../review-rights';

type ReasonKind = 'reject' | 'reverse';

const REASON_COPY: Record<ReasonKind, { title: string; subtitle: string; button: string }> = {
  reject: {
    title: 'Reject payment',
    subtitle: 'The member is emailed your reason and can record the payment again.',
    button: 'Reject payment',
  },
  reverse: {
    title: 'Reverse payment',
    subtitle:
      'For a payment that bounced or was recorded twice. It is taken out of every total; the record stays.',
    button: 'Reverse payment',
  },
};

/** Approve / Reject for a pending payment, Reverse for a confirmed one. */
export function ReviewActions({
  row,
  compact = false,
  onDone,
}: {
  row: Contribution;
  /** In the pending queue: small buttons, no explanation. */
  compact?: boolean;
  onDone?: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const rights = useReviewRights();
  const confirm = useConfirmContribution();
  const [reasonFor, setReasonFor] = useState<ReasonKind | null>(null);

  if (communityId === undefined) return null;
  const own = rights.isOwn(row);
  const amount = `${formatAmount(row.amount_minor)} ${row.currency}`;
  const size = compact ? 'sm' : undefined;

  if (row.status === 'pending' && (rights.canConfirm || rights.canReject)) {
    if (own) {
      return compact ? (
        <span className="table__muted">Your own payment</span>
      ) : (
        <p className="details__note">
          This is your own payment, so another reviewer has to confirm it.
        </p>
      );
    }
    return (
      <div className={compact ? 'review-actions review-actions--compact' : 'review-actions'}>
        {rights.canConfirm && (
          <Button
            inline
            size={size}
            icon={<IconCheckCircle />}
            disabled={confirm.isPending}
            onClick={() =>
              confirm.mutate(
                { communityId, contributionId: row.id },
                { onSuccess: () => onDone?.(`${amount} from ${row.member.full_name} confirmed.`) },
              )
            }
          >
            {confirm.isPending ? 'Approving…' : 'Approve'}
          </Button>
        )}
        {rights.canReject && (
          <Button
            inline
            size={size}
            variant="secondary"
            icon={<IconBan />}
            onClick={() => setReasonFor('reject')}
          >
            Reject
          </Button>
        )}
        {confirm.error && (
          <p className="table__warn" role="alert">
            {errorMessage(confirm.error)}
          </p>
        )}
        <ReasonDialog
          kind={reasonFor}
          row={row}
          onClose={() => setReasonFor(null)}
          onDone={(message) => {
            setReasonFor(null);
            onDone?.(message);
          }}
        />
      </div>
    );
  }

  if (row.status === 'confirmed' && rights.canReverse && !compact) {
    return (
      <div className="review-actions">
        <Button
          inline
          variant="secondary"
          icon={<IconHistory />}
          onClick={() => setReasonFor('reverse')}
        >
          Reverse payment
        </Button>
        <ReasonDialog
          kind={reasonFor}
          row={row}
          onClose={() => setReasonFor(null)}
          onDone={(message) => {
            setReasonFor(null);
            onDone?.(message);
          }}
        />
      </div>
    );
  }

  return null;
}

function ReasonDialog({
  kind,
  row,
  onClose,
  onDone,
}: {
  kind: ReasonKind | null;
  row: Contribution;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const copy = REASON_COPY[kind ?? 'reject'];
  return (
    <Dialog
      open={kind !== null}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      icon={
        <IconTile tone="warning" round>
          {kind === 'reverse' ? <IconHistory /> : <IconBan />}
        </IconTile>
      }
    >
      {kind !== null && <ReasonForm kind={kind} row={row} onClose={onClose} onDone={onDone} />}
    </Dialog>
  );
}

function ReasonForm({
  kind,
  row,
  onClose,
  onDone,
}: {
  kind: ReasonKind;
  row: Contribution;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const reject = useRejectContribution();
  const reverse = useReverseContribution();
  const mutation = kind === 'reject' ? reject : reverse;
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const amount = `${formatAmount(row.amount_minor)} ${row.currency}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim() === '') {
      setError('Tell the member why.');
      return;
    }
    if (communityId === undefined) return;
    mutation.mutate(
      { communityId, contributionId: row.id, reason: reason.trim() },
      {
        onSuccess: () =>
          onDone(
            `${amount} from ${row.member.full_name} ${kind === 'reject' ? 'rejected' : 'reversed'}. They have been emailed.`,
          ),
        onError: (failure) =>
          setError(
            failure instanceof ApiError && failure.fieldErrors.reason
              ? failure.fieldErrors.reason
              : errorMessage(failure),
          ),
      },
    );
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <p className="table__muted">
        {row.member.full_name} · {amount}
        {row.payment_reference ? ` · ${row.payment_reference}` : ''}
      </p>
      <Textarea
        label="Reason"
        placeholder={
          kind === 'reject'
            ? 'e.g. The amount on the MoMo screenshot does not match.'
            : 'e.g. The bank transfer bounced.'
        }
        maxLength={255}
        rows={3}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        error={error}
        required
      />
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : REASON_COPY[kind].button}
        </Button>
      </div>
    </form>
  );
}

const SKIP_LABEL: Record<ReminderResult['skipped'][number]['reason'], string> = {
  paid: 'already paid',
  awaiting_confirmation: 'payment waiting for review',
  nothing_owed: 'nothing owed',
  recently_reminded: 'reminded in the last 24 hours',
};

/** Email everyone who has not paid the month. */
export function RemindersDialog({
  open,
  month,
  monthLabel,
  onClose,
}: {
  open: boolean;
  /** `YYYY-MM`. */
  month: string;
  monthLabel: string;
  onClose: () => void;
}) {
  const { communityId } = useWorkspace();
  const send = useSendReminders();
  const result = send.data;

  const skippedByReason = (result?.skipped ?? []).reduce<Record<string, number>>(
    (counts, skip) => ({ ...counts, [skip.reason]: (counts[skip.reason] ?? 0) + 1 }),
    {},
  );

  function close() {
    send.reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Remind unpaid members"
      subtitle={`Email every member who has not paid for ${monthLabel}.`}
      icon={
        <IconTile tone="warning" round>
          <IconBellAlert />
        </IconTile>
      }
    >
      <div className="dialog__form">
        {result ? (
          <div className="notice notice--success" role="status">
            <IconCheckCircle width={20} height={20} aria-hidden="true" />
            <div>
              <p className="notice__title">
                {result.reminded === 0
                  ? 'Nobody needed a reminder'
                  : `${result.reminded} member${result.reminded === 1 ? '' : 's'} reminded`}
              </p>
              <p className="notice__text">
                {Object.entries(skippedByReason)
                  .map(
                    ([reason, count]) =>
                      `${count} skipped: ${SKIP_LABEL[reason as keyof typeof SKIP_LABEL]}`,
                  )
                  .join(' · ') || 'Everyone who owed was emailed.'}
                {result.failed_member_ids.length > 0 &&
                  ` · ${result.failed_member_ids.length} email(s) failed, try again later.`}
              </p>
            </div>
          </div>
        ) : (
          <p className="table__muted">
            Members who have paid, whose payment is waiting for review, or who were reminded in the
            last 24 hours are skipped.
          </p>
        )}

        {send.error && <p className="form-error">{errorMessage(send.error)}</p>}

        <div className="dialog__footer dialog__footer--flush">
          <Button variant="tint" onClick={close}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              icon={<IconBellAlert />}
              disabled={send.isPending || communityId === undefined}
              onClick={() => communityId && send.mutate({ communityId, month })}
            >
              {send.isPending ? 'Sending…' : 'Send reminders'}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
