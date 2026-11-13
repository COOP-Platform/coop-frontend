import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  ErrorState,
  IconBan,
  IconCheckCircle,
  IconClock,
  IconInfoCircle,
  IconPencil,
  IconUserCheck,
  IconUsers,
  Input,
  LoadingState,
  SegmentedControl,
  StatCard,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  ATTENDANCE_CHANNEL_LABELS,
  ATTENDANCE_STATUS_LABELS,
  formatMeetingDateTime,
  formatMeetingTime,
  hasStarted,
  listFieldErrors,
  useRollCall,
  useSaveRollCall,
} from '../api/meetings';
import type {
  AttendanceChannel,
  AttendanceStatus,
  MeetingDetail,
  RollCall,
  RollCallRecordInput,
} from '../api/meetings';

const STATUS_TONES: Record<AttendanceStatus, BadgeTone> = {
  present: 'success',
  apology: 'warning',
  absent: 'danger',
};

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'apology', label: 'Excused' },
  { value: 'absent', label: 'Absent' },
];

const CHANNELS = Object.keys(ATTENDANCE_CHANNEL_LABELS) as AttendanceChannel[];

/** "Sat 7 Nov 2026, 13:00" when not today, "today at 13:00" when it is. */
function when(iso: string): string {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? `today at ${formatMeetingTime(iso)}`
    : formatMeetingDateTime(iso);
}

/**
 * The "Attendance" tab of a meeting: who came. Every member reads it, notes
 * included. The roll-call can be saved any time (apologies come in advance)
 * but only finished (locked) once the meeting has started. The member who
 * first saves it is its recorder, and only they can change it afterwards;
 * everyone else sees it read-only.
 */
export function MeetingAttendance({ meeting }: { meeting: MeetingDetail }) {
  const { communityId, can } = useWorkspace();
  const rollCall = useRollCall(communityId, meeting.id);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (rollCall.isPending) return <LoadingState label="Loading the roll-call…" />;
  if (rollCall.isError) {
    return (
      <ErrorState title="Could not load the roll-call" message={errorMessage(rollCall.error)} />
    );
  }

  const rc = rollCall.data;
  const cancelled = meeting.status === 'cancelled';
  const lastRecorded = rc.records
    .map((r) => r.recorded_at)
    .filter((at): at is string => at !== null)
    .sort()
    .at(-1);

  return (
    <div className="roll-call">
      <RollCallSummary rollCall={rc} />

      {notice && !editing && (
        <div className="notice notice--success" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">Saved</p>
            <p className="notice__text">{notice}</p>
          </div>
        </div>
      )}

      {cancelled ? (
        <div className="notice notice--info" role="note">
          <IconBan width={20} height={20} aria-hidden="true" />
          <p className="notice__text">This meeting was cancelled, so there is no roll-call.</p>
        </div>
      ) : (
        <RollCallStatus
          rollCall={rc}
          meeting={meeting}
          lastRecorded={lastRecorded}
          canRecord={can('meeting.attendance.record')}
        />
      )}

      {editing && rc.can_edit ? (
        <RollCallForm
          key={rc.locked ? 'locked' : 'open'}
          meeting={meeting}
          rollCall={rc}
          onCancel={() => setEditing(false)}
          onSaved={(message) => {
            setEditing(false);
            setNotice(message);
          }}
        />
      ) : (
        <>
          {rc.can_edit && !cancelled && (
            <div className="section-bar">
              <div />
              <div className="section-bar__actions">
                <Button
                  icon={rc.recorded_by ? <IconPencil /> : <IconUserCheck />}
                  onClick={() => {
                    setNotice(null);
                    setEditing(true);
                  }}
                >
                  {rc.recorded_by ? 'Change the roll-call' : 'Take the roll-call'}
                </Button>
              </div>
            </div>
          )}
          {!cancelled && <RollCallTable rollCall={rc} />}
        </>
      )}
    </div>
  );
}

function RollCallSummary({ rollCall: rc }: { rollCall: RollCall }) {
  const { summary, quorum } = rc;
  return (
    <div className="stat-grid stat-grid--four">
      <StatCard
        label="Present"
        value={`${summary.present} of ${summary.expected}`}
        caption={
          summary.unrecorded > 0 ? `${summary.unrecorded} not recorded yet` : 'Everyone recorded'
        }
        icon={<IconUsers />}
      />
      <StatCard
        label="Excused"
        value={summary.apology}
        caption="Sent an apology"
        icon={<IconInfoCircle />}
        tone="warning"
      />
      <StatCard
        label="Absent"
        value={summary.absent}
        caption="Did not come"
        icon={<IconBan />}
        tone="danger"
      />
      <StatCard
        label="Quorum"
        value={`${quorum.percent}%`}
        caption={`${quorum.threshold}% needed`}
        icon={<IconCheckCircle />}
        tone={quorum.reached ? 'brand' : 'neutral'}
        badge={
          <Badge tone={quorum.reached ? 'success' : 'neutral'}>
            {quorum.reached ? 'Reached' : 'Not reached'}
          </Badge>
        }
      />
    </div>
  );
}

function RollCallStatus({
  rollCall: rc,
  meeting,
  lastRecorded,
  canRecord,
}: {
  rollCall: RollCall;
  meeting: MeetingDetail;
  lastRecorded: string | undefined;
  canRecord: boolean;
}) {
  const { membership } = useWorkspace();
  const mine = rc.recorded_by !== null && rc.recorded_by.membership_id === membership?.id;

  const lines: string[] = [];
  if (rc.recorded_by) {
    lines.push(
      `Recorded by ${mine ? 'you' : rc.recorded_by.full_name}${lastRecorded ? `, last changed ${when(lastRecorded)}` : ''}.`,
    );
  } else {
    lines.push('Nobody has taken the roll-call yet.');
  }
  if (rc.locked && rc.locked_at) {
    lines.push(
      `Finished on ${formatDate(rc.locked_at)}${rc.locked_by ? ` by ${rc.locked_by.full_name}` : ''}.`,
    );
  }
  if (meeting.minutes_published) {
    lines.push('The minutes are final, so the roll-call can no longer change.');
  } else if (canRecord && !rc.can_edit && rc.recorded_by && !mine) {
    lines.push(`Only ${rc.recorded_by.full_name} can change it.`);
  } else if (rc.can_edit && !hasStarted(meeting)) {
    lines.push(
      'The meeting has not started yet. You can note apologies now and finish the roll-call once it starts.',
    );
  }

  return (
    <div className={rc.locked ? 'notice notice--success' : 'notice notice--info'} role="note">
      {rc.locked ? (
        <IconCheckCircle width={20} height={20} aria-hidden="true" />
      ) : (
        <IconClock width={20} height={20} aria-hidden="true" />
      )}
      <div>
        <p className="notice__title">
          {rc.locked
            ? 'Roll-call finished'
            : rc.recorded_by
              ? 'Roll-call in progress'
              : 'Roll-call'}
        </p>
        <p className="notice__text">{lines.join(' ')}</p>
      </div>
    </div>
  );
}

function RollCallTable({ rollCall: rc }: { rollCall: RollCall }) {
  if (rc.records.length === 0) {
    return <p className="table__muted">No members on this roll-call.</p>;
  }
  return (
    <div className="card table-card">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Attendance</th>
              <th scope="col">How</th>
              <th scope="col">Note</th>
            </tr>
          </thead>
          <tbody>
            {rc.records.map((record) => (
              <tr key={record.member.membership_id}>
                <td>
                  <MemberCell name={record.member.full_name} positions={record.member.positions} />
                </td>
                <td>
                  {record.status ? (
                    <Badge tone={STATUS_TONES[record.status]} dot>
                      {ATTENDANCE_STATUS_LABELS[record.status]}
                    </Badge>
                  ) : (
                    <span className="table__muted">Not recorded</span>
                  )}
                </td>
                <td className="table__muted">
                  {record.channel ? ATTENDANCE_CHANNEL_LABELS[record.channel] : '—'}
                </td>
                <td>{record.note ?? <span className="table__muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberCell({ name, positions }: { name: string; positions: string[] }) {
  return (
    <div className="table__person">
      <Avatar name={name} size="sm" />
      <div className="table__stack">
        <span className="table__name">{name}</span>
        {positions.length > 0 && <span className="table__muted">{positions.join(', ')}</span>}
      </div>
    </div>
  );
}

interface Draft {
  status: AttendanceStatus | '';
  channel: AttendanceChannel | '';
  note: string;
}

const EMPTY_DRAFT: Draft = { status: '', channel: '', note: '' };

function RollCallForm({
  meeting,
  rollCall: rc,
  onCancel,
  onSaved,
}: {
  meeting: MeetingDetail;
  rollCall: RollCall;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const save = useSaveRollCall();
  const started = hasStarted(meeting);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      rc.records.map((r) => [
        r.member.membership_id,
        { status: r.status ?? '', channel: r.channel ?? '', note: r.note ?? '' },
      ]),
    ),
  );
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const values = Object.values(drafts);
  const present = values.filter((d) => d.status === 'present').length;
  const unmarked = values.filter((d) => d.status === '').length;

  function setDraft(memberId: string, patch: Partial<Draft>) {
    setDrafts((all) => {
      const next: Draft = { ...(all[memberId] ?? EMPTY_DRAFT), ...patch };
      if (next.status !== 'present') next.channel = '';
      return { ...all, [memberId]: next };
    });
  }

  function markRestPresent() {
    setDrafts((all) =>
      Object.fromEntries(
        Object.entries(all).map(([id, d]) => [
          id,
          d.status === '' ? { ...d, status: 'present' as const, channel: 'in_person' as const } : d,
        ]),
      ),
    );
  }

  function submit(lock: boolean) {
    if (!communityId) return;
    const sent: RollCallRecordInput[] = rc.records
      .map((r) => ({
        id: r.member.membership_id,
        draft: drafts[r.member.membership_id] ?? EMPTY_DRAFT,
      }))
      .filter(({ draft }) => draft.status !== '')
      .map(({ id, draft }) => ({
        member_id: id,
        status: draft.status as AttendanceStatus,
        channel: draft.status === 'present' && draft.channel ? draft.channel : null,
        note: draft.note.trim() || null,
      }));
    setRowErrors({});
    setFormError(null);
    save.mutate(
      { communityId, meetingId: meeting.id, records: sent, lock },
      {
        onSuccess: (result) =>
          onSaved(
            lock
              ? `Roll-call finished: ${result.summary.present} of ${result.summary.expected} present.`
              : rc.locked
                ? 'Your corrections are saved.'
                : `Saved: ${result.summary.present} present so far.`,
          ),
        onError: (error) => {
          const nested = listFieldErrors(error, 'records');
          const byMember: Record<string, string> = {};
          for (const [index, message] of Object.entries(nested.rows)) {
            const record = sent[Number(index)];
            if (record) byMember[record.member_id] = message;
          }
          setRowErrors(byMember);
          setFormError(
            nested.whole ??
              (Object.keys(byMember).length > 0
                ? 'Some members could not be saved. See the rows marked below.'
                : errorMessage(error)),
          );
        },
      },
    );
  }

  return (
    <section className="card roll-call-form" aria-label="Take the roll-call">
      <div className="section-bar">
        <div>
          <h2 className="section-title">{rc.locked ? 'Correct the roll-call' : 'Roll-call'}</h2>
          <p className="table__muted">
            {present} present · {unmarked} not marked yet
            {rc.locked
              ? '. Members you leave unmarked are recorded absent.'
              : '. Notes are visible to every member.'}
          </p>
        </div>
        {unmarked > 0 && (
          <div className="section-bar__actions">
            <Button variant="secondary" size="sm" inline onClick={markRestPresent}>
              Mark the rest present
            </Button>
          </div>
        )}
      </div>

      <ul className="roll-call-form__list">
        {rc.records.map((record) => {
          const id = record.member.membership_id;
          const draft = drafts[id] ?? EMPTY_DRAFT;
          const name = record.member.full_name;
          return (
            <li key={id} className="roll-call-form__row">
              <MemberCell name={name} positions={record.member.positions} />
              <SegmentedControl<AttendanceStatus | ''>
                label={`Attendance of ${name}`}
                options={STATUS_OPTIONS}
                value={draft.status}
                onChange={(status) => setDraft(id, { status })}
              />
              <label className="roll-call-form__channel">
                <span className="visually-hidden">How {name} attended</span>
                <select
                  className="roll-call-form__select"
                  value={draft.channel}
                  disabled={draft.status !== 'present'}
                  onChange={(event) =>
                    setDraft(id, { channel: event.target.value as AttendanceChannel | '' })
                  }
                >
                  <option value="">How? (optional)</option>
                  {CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {ATTENDANCE_CHANNEL_LABELS[channel]}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label={`Note for ${name}`}
                labelHidden
                placeholder="Note (optional)"
                maxLength={255}
                value={draft.note}
                onChange={(event) => setDraft(id, { note: event.target.value })}
                error={rowErrors[id]}
              />
            </li>
          );
        })}
      </ul>

      {formError && <p className="form-error">{formError}</p>}

      <div className="roll-call-form__actions">
        <Button variant="tint" onClick={onCancel} disabled={save.isPending}>
          Cancel
        </Button>
        {rc.locked ? (
          <Button disabled={save.isPending} onClick={() => submit(false)}>
            {save.isPending ? 'Saving…' : 'Save corrections'}
          </Button>
        ) : (
          <>
            <Button variant="secondary" disabled={save.isPending} onClick={() => submit(false)}>
              {save.isPending ? 'Saving…' : 'Save for now'}
            </Button>
            <Button
              disabled={save.isPending || !started}
              title={started ? undefined : 'You can finish the roll-call once the meeting starts.'}
              onClick={() => submit(true)}
            >
              Finish roll-call
            </Button>
          </>
        )}
      </div>
      {!rc.locked && (
        <p className="table__muted roll-call-form__hint">
          {started
            ? 'Finishing records everyone not marked as absent and makes the roll-call final. Only you can correct it afterwards.'
            : 'You can finish the roll-call once the meeting has started.'}
        </p>
      )}
    </section>
  );
}
