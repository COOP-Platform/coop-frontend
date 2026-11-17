import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Button,
  EmptyState,
  ErrorState,
  IconCalendar,
  IconPlus,
  IconTile,
  LoadingState,
  PageHeader,
  SectionCard,
  SegmentedControl,
  TableFooter,
  usePaged,
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
        actions={
          can('meeting.create') && (
            <Button icon={<IconPlus />} onClick={() => setScheduling(true)}>
              Schedule meeting
            </Button>
          )
        }
      />
      <SegmentedControl label="Meetings" options={TABS} value={tab} onChange={onTabChange} />

      {tab === 'minutes' ? <MinutesList /> : <MeetingTable past={tab === 'past'} />}

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

function MeetingTable({ past }: { past: boolean }) {
  const { communityId } = useWorkspace();
  const meetings = useMeetings(communityId);

  const now = Date.now();
  const rows = (meetings.data ?? [])
    .filter((m) => isUpcoming(m, now) !== past)
    .sort((a, b) => {
      const diff = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      return past ? -diff : diff;
    });
  const paged = usePaged(rows);

  return (
    <SectionCard
      title={past ? 'Past meetings' : 'Upcoming meetings'}
      flush
      footer={rows.length > 0 ? <TableFooter {...paged} onPage={paged.setPage} /> : undefined}
    >
      {meetings.isPending ? (
        <LoadingState label="Loading meetings…" />
      ) : meetings.isError ? (
        <ErrorState title="Could not load meetings" message={errorMessage(meetings.error)} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={
            <IconTile tone="neutral" size="lg">
              <IconCalendar />
            </IconTile>
          }
          title={past ? 'No past meetings' : 'No meetings coming up'}
        />
      ) : (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Meeting</th>
                <th scope="col">Date</th>
                <th scope="col">Time</th>
                <th scope="col">Place</th>
                <th scope="col" className="num">
                  Agenda
                </th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function MeetingRow({ meeting }: { meeting: MeetingSummary }) {
  const cancelled = meeting.status === 'cancelled';
  return (
    <tr className={cancelled ? 'meeting-row meeting-row--cancelled' : 'meeting-row'}>
      <td>
        <span className="table__stack">
          <Link
            to="/meetings/$meetingId"
            params={{ meetingId: meeting.id }}
            className="meeting-row__link"
          >
            {meeting.title}
          </Link>
          <span className="table__muted">{MEETING_TYPE_LABELS[meeting.meeting_type]}</span>
        </span>
      </td>
      <td className="meeting-row__nowrap">{formatMeetingDay(meeting.scheduled_at)}</td>
      <td className="meeting-row__nowrap">{formatMeetingTimes(meeting)}</td>
      <td>
        {meeting.location || meeting.online_link ? (
          [meeting.location, meeting.online_link && 'Online'].filter(Boolean).join(' · ')
        ) : (
          <span className="table__muted">—</span>
        )}
      </td>
      <td className="num">{meeting.agenda_count}</td>
      <td>
        <MeetingStatusBadge meeting={meeting} />
      </td>
    </tr>
  );
}
