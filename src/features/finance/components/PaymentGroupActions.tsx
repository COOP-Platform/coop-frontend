import { useState } from 'react';

import { Button, IconBan, IconCheckCircle } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { useConfirmPayment, useRejectPayment } from '../api/contributions';
import type { Contribution } from '../api/my-contributions';
import { formatAmount } from '../format';
import { coversLabel } from '../payment-groups';
import { ReasonPrompt } from './ReasonPrompt';
import { useReviewRights } from '../review-rights';

/**
 * Approve / Reject one payment as a whole: every month it was split into,
 * together. The Treasurer received one sum; the member is told once.
 */
export function PaymentGroupActions({
  rows,
  onDone,
}: {
  rows: readonly Contribution[];
  onDone: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const rights = useReviewRights();
  const confirm = useConfirmPayment();
  const reject = useRejectPayment();
  const [rejecting, setRejecting] = useState(false);
  const first = rows[0];
  if (!communityId || !first) return null;

  const total = rows.reduce((sum, r) => sum + r.amount_minor, 0);
  const amount = `${formatAmount(total)} ${first.currency}`;
  const who = first.member.full_name;
  const ids = { communityId, group: first.payment_group };

  return (
    <div className="review-actions review-actions--compact">
      {rights.canConfirm && (
        <Button
          inline
          size="sm"
          icon={<IconCheckCircle />}
          disabled={confirm.isPending}
          onClick={() =>
            confirm.mutate(ids, {
              onSuccess: () =>
                onDone(
                  `${amount} from ${who} approved (${coversLabel(rows)}). They have been emailed.`,
                ),
            })
          }
        >
          {confirm.isPending ? 'Approving…' : 'Approve'}
        </Button>
      )}
      {rights.canReject && (
        <Button
          inline
          size="sm"
          variant="secondary"
          icon={<IconBan />}
          onClick={() => setRejecting(true)}
        >
          Reject
        </Button>
      )}
      {confirm.error && (
        <p className="table__warn" role="alert">
          {errorMessage(confirm.error)}
        </p>
      )}
      <ReasonPrompt
        open={rejecting}
        title="Reject payment"
        subtitle="Every month of this payment is rejected; the member is told why."
        icon={<IconBan />}
        about={`${who} · ${amount} · ${coversLabel(rows)}`}
        placeholder="e.g. The money did not arrive."
        confirmLabel="Reject payment"
        busy={reject.isPending}
        onClose={() => setRejecting(false)}
        onSubmit={(reason) =>
          reject.mutateAsync({ ...ids, reason }).then(() => {
            setRejecting(false);
            onDone(`${amount} from ${who} rejected. They have been emailed.`);
          })
        }
      />
    </div>
  );
}
