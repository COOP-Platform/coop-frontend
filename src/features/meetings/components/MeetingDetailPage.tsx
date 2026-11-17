import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Badge,
  Button,
  Dialog,
  ErrorState,
  IconArrowLeft,
  IconBan,
  IconCheckCircle,
  IconExternalLink,
  IconPencil,
  IconTile,
  LoadingState,
  PageHeader,
  SectionCard,
  SegmentedControl,
  Textarea,
} from '@/components/ui';
import { runsMeetings, useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  MEETING_TYPE_LABELS,
  formatMeetingDateTime,
  formatMeetingDay,
  formatMeetingTimes,
  isOpen,
  useCancelMeeting,
  useMeeting,
} from '../api/meetings';
import type { MeetingDetail } from '../api/meetings';
import { MeetingAttendance } from './MeetingAttendance';
import { MeetingFormDialog } from './MeetingFormDialog';
import { MeetingMinutesTab } from './MeetingMinutesTab';
import { MeetingStatusBadge } from './MeetingStatusBadge';

export type MeetingTab = 'agenda' | 'attendance' | 'minutes';

const TABS: { value: MeetingTab; label: string }[] = [
  { value: 'agenda', label: 'Agenda' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'minutes', label: 'Minutes' },
];

/** /meetings/$meetingId: one meeting, its agenda, roll-call and minutes. */
export function MeetingDetailPage({
  meetingId,
  tab,
  onTabChange,
}: {
  meetingId: string;
  tab: MeetingTab;
  onTabChange: (tab: MeetingTab) => void;
}) {
  const { communityId, can } = useWorkspace();
  const meeting = useMeeting(communityId, meetingId);
  // Attendance is for whoever runs meetings (Secretary, admins); members see
  // the agenda and the published minutes.
  const runs = runsMeetings(can);
  const tabs = runs ? TABS : TABS.filter((t) => t.value !== 'attendance');
  const shown: MeetingTab = !runs && tab === 'attendance' ? 'agenda' : tab;
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const back = (
    <Link to="/meetings/list" className="meeting-back">
      <IconArrowLeft aria-hidden="true" />
      Meetings
    </Link>
  );

  if (meeting.isPending) {
    return (
      <div className="page">
        {back}
        <LoadingState label="Loading the meeting…" />
      </div>
    );
  }
  if (meeting.isError) {
    const missing = meeting.error instanceof ApiError && meeting.error.status === 404;
    return (
      <div className="page">
        {back}
        <ErrorState
          title={missing ? 'Meeting not found' : 'Could not load this meeting'}
          message={missing ? 'It may have been removed.' : errorMessage(meeting.error)}
        />
      </div>
    );
  }

  const m = meeting.data;
  const open = isOpen(m);

  return (
    <div className="page">
      {back}
      <PageHeader
        title={m.title}
        badge={<MeetingStatusBadge meeting={m} />}
        subtitle={`${formatMeetingDay(m.scheduled_at)} · ${formatMeetingTimes(m)}${m.location ? ` · ${m.location}` : ''}`}
        actions={
          open &&
          (can('meeting.update') || can('meeting.cancel')) && (
            <>
              {can('meeting.update') && (
                <Button
                  variant="secondary"
                  icon={<IconPencil />}
                  onClick={() => {
                    setNotice(null);
                    setEditing(true);
                  }}
                >
                  Edit
                </Button>
              )}
              {can('meeting.cancel') && (
                <Button
                  variant="danger"
                  icon={<IconBan />}
                  onClick={() => {
                    setNotice(null);
                    setCancelling(true);
                  }}
                >
                  Cancel meeting
                </Button>
              )}
            </>
          )
        }
      />

      {notice && (
        <div className="notice notice--success" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <p className="notice__text">{notice}</p>
        </div>
      )}

      {m.status === 'cancelled' && (
        <div className="notice notice--warning" role="note">
          <IconBan width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">
              Cancelled
              {m.cancelled_by && ` by ${m.cancelled_by.full_name}`}
              {m.cancelled_at && ` on ${formatDate(m.cancelled_at)}`}
            </p>
            {m.cancel_reason && <p className="notice__text">{m.cancel_reason}</p>}
          </div>
        </div>
      )}

      <SegmentedControl label="Meeting" options={tabs} value={shown} onChange={onTabChange} />

      {shown === 'agenda' && <AgendaTab meeting={m} />}
      {shown === 'attendance' && <MeetingAttendance meeting={m} />}
      {shown === 'minutes' && <MeetingMinutesTab meetingId={m.id} />}

      <MeetingFormDialog
        open={editing}
        meeting={m}
        onClose={() => setEditing(false)}
        onSaved={(_saved, message) => {
          setEditing(false);
          setNotice(message);
        }}
      />
      <CancelMeetingDialog
        open={cancelling}
        meeting={m}
        onClose={() => setCancelling(false)}
        onDone={(message) => {
          setCancelling(false);
          setNotice(message);
        }}
      />
    </div>
  );
}

function AgendaTab({ meeting: m }: { meeting: MeetingDetail }) {
  const agenda = [...m.agenda].sort((a, b) => a.position - b.position);
  return (
    <div className="meeting-detail">
      <SectionCard title="Details">
        <dl className="meeting-kv">
          <dt>Starts</dt>
          <dd>{formatMeetingDateTime(m.scheduled_at)}</dd>
          <dt>Ends</dt>
          <dd>{m.ends_at ? formatMeetingDateTime(m.ends_at) : '—'}</dd>
          <dt>Place</dt>
          <dd>{m.location ?? '—'}</dd>
          <dt>Online</dt>
          <dd>
            {m.online_link ? (
              <a
                href={m.online_link}
                target="_blank"
                rel="noreferrer noopener"
                className="meeting-link"
              >
                Join the call <IconExternalLink aria-hidden="true" />
              </a>
            ) : (
              '—'
            )}
          </dd>
          <dt>Type</dt>
          <dd>{MEETING_TYPE_LABELS[m.meeting_type]}</dd>
          <dt>Quorum</dt>
          <dd>{m.quorum_threshold_percent}%</dd>
          <dt>Scheduled by</dt>
          <dd>{m.created_by.full_name}</dd>
        </dl>
        {m.description && <p className="meeting-detail__description">{m.description}</p>}
      </SectionCard>

      <SectionCard
        title="Agenda"
        flush={agenda.length > 0}
        actions={agenda.length > 0 ? <Badge tone="neutral">{agenda.length}</Badge> : undefined}
      >
        {agenda.length === 0 ? (
          <p className="table__muted">Nothing on the agenda yet.</p>
        ) : (
          <ol className="agenda-list">
            {agenda.map((item) => (
              <li key={item.id} className="agenda-list__item">
                <span className="agenda-list__number" aria-hidden="true">
                  {item.position}
                </span>
                <div className="table__stack">
                  <span className="agenda-list__title">{item.title}</span>
                  {item.description && <span className="table__muted">{item.description}</span>}
                </div>
                {item.presenter && (
                  <span className="agenda-list__presenter">{item.presenter.full_name}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
    </div>
  );
}

function CancelMeetingDialog({
  open,
  meeting,
  onClose,
  onDone,
}: {
  open: boolean;
  meeting: MeetingDetail;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const cancel = useCancelMeeting();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function close() {
    setReason('');
    setError(null);
    cancel.reset();
    onClose();
  }

  function submit() {
    if (reason.trim().length < 3) {
      setError('Tell members why, in a few words.');
      return;
    }
    if (!communityId) return;
    setError(null);
    cancel.mutate(
      { communityId, meetingId: meeting.id, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('');
          onDone(`${meeting.title} is cancelled.`);
        },
        onError: (e) =>
          setError(
            e instanceof ApiError && e.fieldErrors.reason ? e.fieldErrors.reason : errorMessage(e),
          ),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Cancel this meeting?"
      subtitle="Members will see it is cancelled, and why. This cannot be undone."
      icon={
        <IconTile tone="danger" round>
          <IconBan />
        </IconTile>
      }
    >
      <div className="dialog__form">
        <Textarea
          label="Why is it cancelled?"
          rows={2}
          maxLength={255}
          placeholder="e.g. The venue is not available; we will choose a new date."
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          error={error ?? undefined}
          required
        />
        <div className="dialog__footer dialog__footer--flush">
          <Button variant="tint" onClick={close}>
            Keep meeting
          </Button>
          <Button variant="danger" disabled={cancel.isPending} onClick={submit}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel meeting'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
