import { useState } from 'react';

import {
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconAlertTriangle,
  IconCheckCircle,
  IconDownload,
  IconFeather,
  IconFile,
  IconPencil,
  IconTile,
  LoadingState,
  SectionCard,
} from '@/components/ui';
import { runsMeetings, useWorkspace } from '@/features/auth';
import { ApiError, apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import {
  minutesPdfName,
  minutesPdfPath,
  useFinaliseMinutes,
  useMinutes,
  useSetActionItemDone,
} from '../api/minutes';
import type { ActionItem, MinutesDetail } from '../api/minutes';
import { MinutesEditor } from './MinutesEditor';
import { DecisionResultBadge, MinutesStatusBadge } from './MinutesStatusBadge';

/**
 * CONTRACT (owned by the Minutes work): the "Minutes" tab of one meeting's
 * page (/meetings/$meetingId?tab=minutes): read, write, edit, finalise and
 * download the minutes of that meeting.
 *
 * Members see final minutes only (a draft is hidden from them by the
 * backend). meeting.minutes.write starts and edits the draft;
 * meeting.minutes.publish finalises it once the roll-call is locked.
 */
export function MeetingMinutesTab({ meetingId }: { meetingId: string }) {
  const { communityId, can } = useWorkspace();
  const canWrite = can('meeting.minutes.write');
  const canPublish = can('meeting.minutes.publish');
  const { data, error, isPending } = useMinutes(communityId, meetingId);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (data === undefined) {
    return isPending ? <LoadingState /> : <ErrorState message={errorMessage(error)} />;
  }

  const minutes = data;
  const editable = minutes === null || minutes.status === 'draft';

  if (editing && canWrite && editable) {
    return (
      <MinutesEditor
        meetingId={meetingId}
        minutes={minutes}
        onCancel={() => setEditing(false)}
        onSaved={(message) => {
          setEditing(false);
          setNotice(message);
        }}
      />
    );
  }

  return (
    <div className="minutes-tab">
      {notice && <DoneNotice text={notice} />}
      {minutes === null ? (
        <div className="card">
          <EmptyState
            icon={
              <IconTile tone="neutral" size="lg">
                <IconFeather />
              </IconTile>
            }
            title="No minutes yet"
            action={
              canWrite ? (
                <Button
                  inline
                  icon={<IconPencil />}
                  onClick={() => {
                    setNotice(null);
                    setEditing(true);
                  }}
                >
                  Write minutes
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <MinutesView
          minutes={minutes}
          canWrite={canWrite}
          canPublish={canPublish}
          onEdit={() => {
            setNotice(null);
            setEditing(true);
          }}
          onFinalised={() => setNotice('The minutes are final and shared with every member.')}
        />
      )}
    </div>
  );
}

function DoneNotice({ text }: { text: string }) {
  return (
    <div className="notice notice--success" role="status">
      <IconCheckCircle width={20} height={20} aria-hidden="true" />
      <p className="notice__text">{text}</p>
    </div>
  );
}

function MinutesView({
  minutes,
  canWrite,
  canPublish,
  onEdit,
  onFinalised,
}: {
  minutes: MinutesDetail;
  canWrite: boolean;
  canPublish: boolean;
  onEdit: () => void;
  onFinalised: () => void;
}) {
  const { communityId, can } = useWorkspace();
  // The roll-call figures are for whoever runs meetings; members read the minutes.
  const seesAttendance = canWrite || canPublish || runsMeetings(can);
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const draft = minutes.status === 'draft';
  const cancelled = minutes.meeting.status === 'cancelled';

  async function download() {
    if (!communityId) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await apiDownload(minutesPdfPath(communityId, minutes.id), minutesPdfName(minutes.meeting));
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <article className="minutes-view">
      <SectionCard
        title={
          <>
            Minutes <MinutesStatusBadge status={minutes.status} />
          </>
        }
        className="minutes-view__record"
        actions={
          <>
            {draft && canWrite && (
              <Button variant="secondary" size="sm" inline icon={<IconPencil />} onClick={onEdit}>
                Edit
              </Button>
            )}
            {draft && canPublish && !cancelled && (
              <Button
                size="sm"
                inline
                icon={<IconCheckCircle />}
                onClick={() => setConfirming(true)}
              >
                Finalise
              </Button>
            )}
            {!draft && (
              <Button
                variant="secondary"
                size="sm"
                inline
                icon={<IconDownload />}
                disabled={downloading}
                onClick={() => void download()}
              >
                {downloading ? 'Preparing…' : 'Download PDF'}
              </Button>
            )}
          </>
        }
      >
        {downloadError && (
          <p className="form-error" role="alert">
            {downloadError}
          </p>
        )}

        {draft && cancelled && (
          <div className="notice notice--warning">
            <IconAlertTriangle width={20} height={20} aria-hidden="true" />
            <p className="notice__text">Meeting cancelled: these minutes cannot be finalised.</p>
          </div>
        )}
        {draft && canPublish && !cancelled && !minutes.attendance_recorded && (
          <div className="notice notice--warning">
            <IconAlertTriangle width={20} height={20} aria-hidden="true" />
            <div>
              <p className="notice__title">No roll-call yet</p>
              <p className="notice__text">Take it on the Attendance tab before finalising.</p>
            </div>
          </div>
        )}

        <dl className="meeting-kv minutes-view__facts">
          <dt>Meeting</dt>
          <dd>{formatLongDate(minutes.meeting.scheduled_at)}</dd>
          {minutes.meeting.location && (
            <>
              <dt>Place</dt>
              <dd>{minutes.meeting.location}</dd>
            </>
          )}
          {seesAttendance && minutes.quorum && (
            <>
              <dt>Attendance</dt>
              <dd>
                {`${minutes.quorum.present} of ${minutes.quorum.expected} (${minutes.quorum.percent}%) · ${
                  minutes.quorum.reached ? 'quorum reached' : 'no quorum'
                }`}
              </dd>
            </>
          )}
          {draft ? (
            <>
              <dt>Changed</dt>
              <dd>{formatDate(minutes.updated_at)}</dd>
            </>
          ) : (
            <>
              <dt>Finalised</dt>
              <dd>
                {minutes.finalized_at ? formatLongDate(minutes.finalized_at) : '—'}
                {minutes.finalized_by && ` · ${minutes.finalized_by.full_name}`}
              </dd>
            </>
          )}
        </dl>
      </SectionCard>

      {minutes.agenda.length > 0 && (
        <SectionCard title="Agenda">
          <ol className="minutes-view__agenda">
            {minutes.agenda.map((item) => (
              <li key={item.position}>{item.title}</li>
            ))}
          </ol>
        </SectionCard>
      )}

      <SectionCard title="Notes">
        {minutes.discussion.trim() ? (
          <p className="minutes-view__notes">{minutes.discussion}</p>
        ) : (
          <p className="table__muted">No notes.</p>
        )}
      </SectionCard>

      <SectionCard title="Decisions">
        {minutes.decisions.length === 0 ? (
          <p className="table__muted">No decisions.</p>
        ) : (
          <ol className="minutes-view__decisions">
            {minutes.decisions.map((d) => (
              <li key={d.id} className="minutes-view__decision">
                <div className="minutes-view__decision-head">
                  <span className="minutes-view__decision-title">{d.title}</span>
                  <DecisionResultBadge result={d.result} />
                </div>
                {d.detail && <p className="minutes-view__decision-detail">{d.detail}</p>}
                {d.votes_for + d.votes_against + d.votes_abstain > 0 && (
                  <p className="table__muted">
                    {d.votes_for} for · {d.votes_against} against · {d.votes_abstain} abstained
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </SectionCard>

      <SectionCard
        title="Action items"
        flush={minutes.action_items.length > 0}
        footer={
          toggleError ? (
            <p className="form-error" role="alert">
              {toggleError}
            </p>
          ) : undefined
        }
      >
        {minutes.action_items.length === 0 ? (
          <p className="table__muted">No action items.</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">What</th>
                  <th scope="col">Who</th>
                  <th scope="col">Due</th>
                  <th scope="col">Done</th>
                </tr>
              </thead>
              <tbody>
                {minutes.action_items.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{a.assignee?.full_name ?? <span className="table__muted">Nobody</span>}</td>
                    <td>
                      {a.due_date ? (
                        formatDate(a.due_date)
                      ) : a.ongoing ? (
                        'Ongoing'
                      ) : (
                        <span className="table__muted">—</span>
                      )}
                    </td>
                    <td>
                      <ActionItemDone item={a} minutesId={minutes.id} onError={setToggleError} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {confirming && (
        <FinaliseDialog
          minutes={minutes}
          onClose={() => setConfirming(false)}
          onDone={() => {
            setConfirming(false);
            onFinalised();
          }}
        />
      )}
    </article>
  );
}

/**
 * Whether an action item is done. Its assignee, and whoever writes minutes or
 * manages meetings, can tick it off (or open it again) here, even once the
 * minutes are final.
 */
function ActionItemDone({
  item,
  minutesId,
  onError,
}: {
  item: ActionItem;
  minutesId: string;
  onError: (message: string | null) => void;
}) {
  const { communityId } = useWorkspace();
  const toggle = useSetActionItemDone();
  const who = item.done_by ? ` by ${item.done_by.full_name}` : '';
  const when = item.done_at ? ` on ${formatDate(item.done_at)}` : '';
  const marked = item.done && (who || when) ? `Marked${who}${when}` : null;

  if (!item.can_mark_done) {
    return item.done ? (
      <span className="table__stack">
        <span className="table__success">Done</span>
        {marked && <span className="table__muted">{marked}</span>}
      </span>
    ) : (
      <span className="table__muted">Not yet</span>
    );
  }

  return (
    <span className="table__stack">
      <label className="minutes-done-toggle">
        <input
          type="checkbox"
          checked={item.done}
          disabled={toggle.isPending || !communityId}
          onChange={(e) => {
            if (!communityId) return;
            onError(null);
            toggle.mutate(
              { communityId, meetingId: minutesId, itemId: item.id, done: e.target.checked },
              { onError: (error) => onError(errorMessage(error)) },
            );
          }}
        />
        <span className={item.done ? 'table__success' : undefined}>
          {item.done ? 'Done' : 'Mark done'}
        </span>
        <span className="visually-hidden">: {item.title}</span>
      </label>
      {marked && <span className="table__muted">{marked}</span>}
    </span>
  );
}

function FinaliseDialog({
  minutes,
  onClose,
  onDone,
}: {
  minutes: MinutesDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const { communityId } = useWorkspace();
  const finalise = useFinaliseMinutes();
  const [problem, setProblem] = useState<string | null>(null);

  function confirm() {
    if (!communityId) return;
    setProblem(null);
    finalise.mutate(
      { communityId, meetingId: minutes.id },
      {
        onSuccess: onDone,
        onError: (error) => {
          if (error instanceof ApiError && error.code === 'attendance_missing') {
            setProblem('Take the roll-call on the Attendance tab before finalising the minutes.');
          } else {
            setProblem(errorMessage(error));
          }
        },
      },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Finalise these minutes?"
      subtitle={minutes.meeting.title}
      icon={
        <IconTile tone="warning" round>
          <IconFile />
        </IconTile>
      }
    >
      <div className="dialog__form">
        <p>
          Every member will see them, and they <strong>can never be edited again</strong>.
        </p>
        {minutes.meeting.status === 'scheduled' || minutes.meeting.status === 'in_progress' ? (
          <p className="table__muted">The meeting will also be marked completed.</p>
        ) : null}
        {problem && (
          <p className="form-error" role="alert">
            {problem}
          </p>
        )}
        <div className="dialog__footer dialog__footer--flush">
          <Button variant="tint" onClick={onClose} disabled={finalise.isPending}>
            Not yet
          </Button>
          <Button onClick={confirm} disabled={finalise.isPending}>
            {finalise.isPending ? 'Finalising…' : 'Finalise minutes'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
