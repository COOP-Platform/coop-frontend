import { Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

import { RESULT_LABEL } from '../api/minutes';
import type { DecisionResult, MinutesStatus } from '../api/minutes';

export function MinutesStatusBadge({ status }: { status: MinutesStatus }) {
  return status === 'final' ? (
    <Badge tone="success" dot>
      Final
    </Badge>
  ) : (
    <Badge tone="warning" dot>
      Draft
    </Badge>
  );
}

const RESULT_TONE: Record<DecisionResult, BadgeTone> = {
  adopted: 'success',
  rejected: 'danger',
  deferred: 'neutral',
};

export function DecisionResultBadge({ result }: { result: DecisionResult }) {
  return <Badge tone={RESULT_TONE[result]}>{RESULT_LABEL[result]}</Badge>;
}
