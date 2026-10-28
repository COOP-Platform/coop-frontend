import { useState } from 'react';

import { Button, Dialog, IconTile, IconUserOff } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import type { Position } from '@/features/positions';
import { useDeletePosition } from '@/features/positions';
import { errorMessage } from '@/lib/api/errors';

/**
 * The community does not want these officer seats: delete them so they stop
 * showing as unassigned. Positions can be re-created from the Positions page
 * at any time. There is no bulk endpoint, so it is one DELETE per position.
 */
export function RemoveVacantDialog({
  positions,
  onClose,
}: {
  positions: readonly Position[] | null;
  onClose: () => void;
}) {
  const { communityId } = useWorkspace();
  const remove = useDeletePosition(communityId ?? '');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function confirm() {
    if (positions === null) return;
    setRunning(true);
    setError(null);
    try {
      for (const position of positions) {
        await remove.mutateAsync(position.id);
      }
      onClose();
    } catch (caught) {
      setError(caught);
    } finally {
      setRunning(false);
    }
  }

  const names = (positions ?? []).map((p) => p.name).join(', ');

  return (
    <Dialog
      open={positions !== null}
      onClose={onClose}
      title="Remove unassigned positions?"
      subtitle="For a community that does not need a committee."
      icon={
        <IconTile tone="warning" round>
          <IconUserOff />
        </IconTile>
      }
      footer={
        <>
          <Button variant="tint" onClick={onClose}>
            Keep them
          </Button>
          <Button variant="danger" disabled={running} onClick={() => void confirm()}>
            {running ? 'Removing…' : 'Remove positions'}
          </Button>
        </>
      }
    >
      <p className="dialog__text">
        <strong>{names}</strong> will be deleted. Nobody holds them, so nobody loses anything. You
        can create positions again from the Positions page whenever you need them.
      </p>
      {error !== null && <p className="form-error">{errorMessage(error)}</p>}
    </Dialog>
  );
}
