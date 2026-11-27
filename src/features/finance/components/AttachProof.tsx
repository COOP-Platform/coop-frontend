import { useState } from 'react';

import { Button, IconUploadCloud } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useAttachProof } from '../api/my-contributions';
import type { Contribution } from '../api/my-contributions';
import { FilePicker } from './FilePicker';

/**
 * For a payment recorded before the screenshot was to hand: attach the proof
 * now, while it is still pending (backend: once the Treasurer decides, the
 * evidence they decided on stays as it was). Only the member's own payment.
 */
export function AttachProof({ row }: { row: Contribution }) {
  const { communityId, membership, can } = useWorkspace();
  const attach = useAttachProof();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);

  // Proof is the payer's to give: the member who paid, never the Treasurer
  // (or anyone who reviews payments), and only while none is attached.
  const paidIt = membership !== undefined && row.member.membership_id === membership.id;
  const reviews = can('finance.contribution.confirm') || can('finance.contribution.reject');
  if (row.status !== 'pending' || !paidIt || reviews || row.proof_count > 0) return null;

  if (done) {
    return <p className="details__note">Proof attached.</p>;
  }

  return (
    <div className="attach-proof">
      <FilePicker
        label={row.proof_count > 0 ? 'Add another proof' : 'Attach proof of payment'}
        prompt="or drag the MoMo screenshot or bank slip here"
        value={file}
        onChange={(next) => {
          setFile(next);
          setError(undefined);
        }}
        error={error}
      />
      {file && (
        <Button
          inline
          icon={<IconUploadCloud />}
          disabled={attach.isPending || !communityId}
          onClick={() =>
            communityId &&
            attach.mutate(
              { communityId, contributionId: row.id, proof: file },
              {
                onSuccess: () => {
                  setDone(true);
                  setFile(null);
                },
                onError: (failure) =>
                  setError(
                    failure instanceof ApiError && failure.status === 503
                      ? 'Attachments are not available yet on this server.'
                      : failure instanceof ApiError && failure.fieldErrors.proof
                        ? failure.fieldErrors.proof
                        : errorMessage(failure),
                  ),
              },
            )
          }
        >
          {attach.isPending ? 'Uploading…' : 'Upload proof'}
        </Button>
      )}
    </div>
  );
}
