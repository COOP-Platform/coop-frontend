import { Badge } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

import { meetingPhase } from '../api/meetings';
import type { Meeting, MeetingPhase } from '../api/meetings';

const PHASES: Record<MeetingPhase, { label: string; tone: BadgeTone }> = {
  scheduled: { label: 'Coming up', tone: 'info' },
  now: { label: 'Happening now', tone: 'success' },
  held: { label: 'Held', tone: 'neutral' },
  completed: { label: 'Minutes final', tone: 'brand' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
};

/** Where a meeting stands, worked out from its status and its dates. */
export function MeetingStatusBadge({ meeting }: { meeting: Meeting }) {
  const phase = PHASES[meetingPhase(meeting)];
  return (
    <Badge tone={phase.tone} dot>
      {phase.label}
    </Badge>
  );
}
