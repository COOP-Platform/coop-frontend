import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconCalendar,
  IconClock,
  IconFile,
  IconLink,
  IconMapPin,
  IconPlus,
  IconTile,
  LoadingState,
  PageHeader,
  SegmentedControl,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import {
  MEETING_TYPE_LABELS,
  formatMeetingDay,
  formatMeetingTimes,
  isUpcoming,
  useMeetings,
} from '../api/meetings';
import type { MeetingSummary } from '../api/meetings';
import { MinutesList } from './MinutesList';
import { MeetingFormDialog } from './MeetingFormDialog';
import { MeetingStatusBadge } from './MeetingStatusBadge';

export type MeetingsTab = 'upcoming' | 'past' | 'minutes';

const TABS: { value: MeetingsTab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'minutes', label: 'Minutes' },
];

/**
 * /meetings/list: the community's meetings, coming up and past, and their
 * minutes. Every member reads; meeting.create schedules a new one.
 */
export function MeetingsListPage({
  tab,
  onTabChange,
}: {
  tab: MeetingsTab;
  onTabChange: (tab: MeetingsTab) => void;
}) {
  const { can } = useWorkspace();
  const navigate = useNavigate();
  const [scheduling, setScheduling] = useState(false);

  return (
    <div className="page">
      <PageHeader
        title="Meetings"
        subtitle="When the family meets, what will be discussed, who came, and what was decided."
        actions={
          can('meeting.create') && (
            <Button icon={<IconPlus />} onClick={() => setScheduling(true)}>
              Schedule meeting
            </Button>
          )
        }
      />
      <SegmentedControl label="Meetings" options={TABS} value={tab} onChange={onTabChange} />

      {tab === 'minutes' ? <MinutesList /> : <MeetingCards past={tab === 'past'} />}

      <MeetingFormDialog
        open={scheduling}
        meeting={null}
        onClose={() => setScheduling(false)}
        onSaved={(saved) => {
          setScheduling(false);
          void navigate({ to: '/meetings/$meetingId', params: { meetingId: saved.id } });
        }}
      />
    </div>
  );
}

function MeetingCards({ past }: { past: boolean }) {
  const { communityId, can } = useWorkspace();
  const meetings = useMeetings(communityId);

  if (meetings.isPending) return <LoadingState label="Loading meetings…" />;
  if (meetings.isError) {
    return <ErrorState title="Could not load meetings" message={errorMessage(meetings.error)} />;
  }

  const now = Date.now();
  const rows = meetings.data
    .filter((m) => isUpcoming(m, now) !== past)
    .sort((a, b) => {
      const diff = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      return past ? -diff : diff;
    });

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={
          <IconTile tone="neutral" size="lg">
            <IconCalendar />
          </IconTile>
        }
        title={past ? 'No past meetings yet' : 'No meetings coming up'}
        message={
          past
            ? 'Meetings appear here once they have taken place.'
            : can('meeting.create')
              ? 'Schedule the next meeting so everyone knows when to come.'
              : 'When a meeting is scheduled, it shows up here.'
        }
      />
    );
  }

  return (
    <ul className="meeting-list">
      {rows.map((meeting) => (
        <li key={meeting.id}>
          <MeetingCard meeting={meeting} />
        </li>
      ))}
    </ul>
  );
}

function MeetingCard({ meeting }: { meeting: MeetingSummary }) {
  const start = new Date(meeting.scheduled_at);
  const cancelled = meeting.status === 'cancelled';
  return (
    <Link
      to="/meetings/$meetingId"
      params={{ meetingId: meeting.id }}
      className={cancelled ? 'card meeting-card meeting-card--cancelled' : 'card meeting-card'}
    >
      <div className="meeting-card__date" aria-hidden="true">
        <span className="meeting-card__month">
          {start.toLocaleDateString('en-GB', { month: 'short' })}
        </span>
        <span className="meeting-card__day">{start.getDate()}</span>
      </div>
      <div className="meeting-card__body">
        <div className="meeting-card__head">
          <h3 className="meeting-card__title">{meeting.title}</h3>
          <MeetingStatusBadge meeting={meeting} />
        </div>
        <ul className="meeting-card__facts">
          <li>
            <Badge tone="neutral">{MEETING_TYPE_LABELS[meeting.meeting_type]}</Badge>
          </li>
          <li>
            <IconClock aria-hidden="true" />
            {formatMeetingDay(meeting.scheduled_at)} · {formatMeetingTimes(meeting)}
          </li>
          {meeting.location && (
            <li>
              <IconMapPin aria-hidden="true" />
              {meeting.location}
            </li>
          )}
          {meeting.online_link && (
            <li>
              <IconLink aria-hidden="true" />
              Online
            </li>
          )}
          <li>
            <IconFile aria-hidden="true" />
            {meeting.agenda_count === 0
              ? 'No agenda yet'
              : `${meeting.agenda_count} agenda item${meeting.agenda_count === 1 ? '' : 's'}`}
          </li>
        </ul>
      </div>
    </Link>
  );
}
