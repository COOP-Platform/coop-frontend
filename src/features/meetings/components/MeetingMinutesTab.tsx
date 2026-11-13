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
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError, apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import { minutesPdfName, minutesPdfPath, useFinaliseMinutes, useMinutes } from '../api/minutes';
import type { MinutesDetail } from '../api/minutes';
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
            message={
              canWrite
                ? 'Write down what was discussed, the decisions taken and the work agreed. It stays a draft until it is finalised.'
                : 'The minutes of this meeting will appear here once the secretary has finalised them.'
            }
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
          onFinalised={() => setNotice('The minutes are final and now shared with every member.')}
        />
      )}
    </div>
  );
}

function DoneNotice({ text }: { text: string }) {
  return (
    <div className="notice notice--success" role="status">
      <IconCheckCircle width={20} height={20} aria-hidden="true" />
      <div>
        <p className="notice__title">Done</p>
        <p className="notice__text">{text}</p>
      </div>
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
  const { communityId } = useWorkspace();
  const [confirming, setConfirming] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
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
      <section className="card minutes-view__record">
        <div className="section-bar">
          <div>
            <h2 className="section-title">
              Minutes <MinutesStatusBadge status={minutes.status} />
            </h2>
            <p className="table__muted">
              {draft
                ? `Draft, last changed ${formatDate(minutes.updated_at)}. Only those who write or finalise minutes can see it.`
                : `Finalised${minutes.finalized_at ? ` on ${formatLongDate(minutes.finalized_at)}` : ''}${
                    minutes.finalized_by ? ` by ${minutes.finalized_by.full_name}` : ''
                  }. They can no longer be changed.`}
            </p>
          </div>
          <div className="section-bar__actions review-actions">
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
          </div>
        </div>
        {downloadError && (
          <p className="form-error" role="alert">
            {downloadError}
          </p>
        )}

        {draft && cancelled && (
          <div className="notice notice--warning">
            <IconAlertTriangle width={20} height={20} aria-hidden="true" />
            <p className="notice__text">
              This meeting was cancelled, so these minutes cannot be finalised.
            </p>
          </div>
        )}
        {draft && canPublish && !cancelled && !minutes.attendance_recorded && (
          <div className="notice notice--warning">
            <IconAlertTriangle width={20} height={20} aria-hidden="true" />
            <div>
              <p className="notice__title">Attendance is not recorded yet</p>
              <p className="notice__text">
                Save and lock the attendance on the Attendance tab before finalising the minutes.
              </p>
            </div>
          </div>
        )}

        <dl className="details__list minutes-view__facts">
          <div>
            <dt>Meeting</dt>
            <dd>{formatLongDate(minutes.meeting.scheduled_at)}</dd>
          </div>
          {minutes.meeting.location && (
            <div>
              <dt>Place</dt>
              <dd>{minutes.meeting.location}</dd>
            </div>
          )}
          {minutes.quorum && (
            <div>
              <dt>Attendance</dt>
              <dd>
                {`${minutes.quorum.present} of ${minutes.quorum.expected} present (${minutes.quorum.percent}%) · ${
                  minutes.quorum.reached ? 'quorum reached' : 'quorum not reached'
                }${minutes.attendance_recorded ? '' : ' · not locked yet'}`}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {minutes.agenda.length > 0 && (
        <section className="card minutes-view__section">
          <h3 className="section-title">Agenda</h3>
          <ol className="minutes-view__agenda">
            {minutes.agenda.map((item) => (
              <li key={item.position}>{item.title}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="card minutes-view__section">
        <h3 className="section-title">Notes</h3>
        {minutes.discussion.trim() ? (
          <p className="minutes-view__notes">{minutes.discussion}</p>
        ) : (
          <p className="table__muted">No notes written.</p>
        )}
      </section>

      <section className="card minutes-view__section">
        <h3 className="section-title">Decisions</h3>
        {minutes.decisions.length === 0 ? (
          <p className="table__muted">No decisions recorded.</p>
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
      </section>

      <section className="card table-card minutes-view__section">
        <header className="table-card__head">
          <h3 className="section-title">Action items</h3>
        </header>
        {minutes.action_items.length === 0 ? (
          <p className="table__muted minutes-view__pad">No action items recorded.</p>
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
                      ) : (
                        <span className="table__muted">No date</span>
                      )}
                    </td>
                    <td>
                      {a.done ? (
                        <span className="table__success">Done</span>
                      ) : (
                        <span className="table__muted">Not yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
            setProblem(
              'Record attendance before finalising minutes. Save and lock the roll-call on the Attendance tab first.',
            );
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
          Once finalised, the minutes are shared with every member and{' '}
          <strong>can never be edited again</strong>. Check the notes, decisions and action items
          first.
        </p>
        {minutes.meeting.status === 'scheduled' || minutes.meeting.status === 'in_progress' ? (
          <p className="table__muted">The meeting will also be marked as completed.</p>
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
