import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Avatar,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconArrowLeft,
  IconBan,
  IconCheckCircle,
  IconEyeOff,
  IconFlag,
  IconLock,
  IconPencil,
  IconTile,
  LoadingState,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/date';

import { eventTypeLabel, formatEventWhen, useCancelEvent, useEvent } from '../api/events';
import type { CommunityEvent } from '../api/events';
import { EventFormDialog, HIDDEN_EXPLAINER } from './EventFormDialog';
import { EventRsvp } from './EventRsvp';
import { EventStatusBadge, HiddenBadge } from './EventsPage';

function BackLink() {
  return (
    <Link to="/meetings/events" className="event-detail__back">
      <IconArrowLeft width={16} height={16} aria-hidden="true" /> All events
    </Link>
  );
}

/**
 * One event: its details, the caller's answer, the counts, and for the
 * committee who it is hidden from, Edit and Cancel. A member the event is
 * hidden from gets 404 from the backend, so they see "not available", the
 * same as for an event that does not exist.
 */
export function EventDetailPage({ eventId }: { eventId: string }) {
  const { communityId } = useWorkspace();
  const event = useEvent(communityId, eventId);
  const [notice, setNotice] = useState<string | null>(null);

  if (event.data === undefined) {
    if (event.isPending) return <LoadingState label="Loading event…" />;
    const notFound = event.error instanceof ApiError && event.error.status === 404;
    return (
      <div className="page">
        <BackLink />
        <section className="card">
          {notFound ? (
            <EmptyState
              icon={
                <IconTile tone="neutral" size="lg">
                  <IconLock />
                </IconTile>
              }
              title="This event isn't available"
              message="It may have been removed, or it is not shared with you. Check the events list for what is coming up."
              action={
                <Link to="/meetings/events" className="btn btn--secondary btn--inline">
                  See all events
                </Link>
              }
            />
          ) : (
            <ErrorState message={errorMessage(event.error)} />
          )}
        </section>
      </div>
    );
  }

  return <EventDetails event={event.data} notice={notice} onNotice={setNotice} />;
}

function EventDetails({
  event,
  notice,
  onNotice,
}: {
  event: CommunityEvent;
  notice: string | null;
  onNotice: (message: string | null) => void;
}) {
  const { membership, can } = useWorkspace();
  const [editing, setEditing] = useState<'all' | 'hidden' | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const upcoming = event.status === 'scheduled';
  const isOrganiser = event.created_by.membership_id === membership?.id;
  const canEdit = can('event.update') && event.status !== 'cancelled';
  // On a cancelled event the backend still lets the organiser show it to
  // everyone again (changing who it is hidden from is the only edit left).
  const canEditHiddenOnly =
    can('event.update') &&
    can('event.visibility.manage') &&
    isOrganiser &&
    event.status === 'cancelled' &&
    (event.hidden_from?.length ?? 0) > 0;
  const canCancel = can('event.cancel') && upcoming;
  const { confirmed, apologies, pending, expected, guests } = event.rsvp;

  return (
    <div className="page">
      <BackLink />
      <PageHeader
        eyebrow={<span className="eyebrow eyebrow--muted">{eventTypeLabel(event.event_type)}</span>}
        title={event.title}
        badge={<EventStatusBadge event={event} />}
        subtitle={`Organised by ${event.created_by.full_name}`}
        actions={
          canEdit || canCancel || canEditHiddenOnly ? (
            <div className="review-actions">
              {canEdit && (
                <Button
                  variant="secondary"
                  inline
                  icon={<IconPencil />}
                  onClick={() => setEditing('all')}
                >
                  Edit
                </Button>
              )}
              {canEditHiddenOnly && (
                <Button
                  variant="secondary"
                  inline
                  icon={<IconEyeOff />}
                  onClick={() => setEditing('hidden')}
                >
                  Who can see it
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="secondary"
                  inline
                  icon={<IconBan />}
                  onClick={() => setCancelling(true)}
                >
                  Cancel event
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {notice && (
        <div className="notice notice--success" role="status">
          <IconCheckCircle width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">Done</p>
            <p className="notice__text">{notice}</p>
          </div>
        </div>
      )}

      {event.status === 'cancelled' && (
        <div className="notice notice--warning" role="status">
          <IconBan width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">
              This event was cancelled
              {event.cancelled_at ? ` on ${formatLongDate(event.cancelled_at)}` : ''}
            </p>
            {event.cancel_reason && <p className="notice__text">{event.cancel_reason}</p>}
          </div>
        </div>
      )}

      <div className="event-detail">
        <section className="card event-detail__main" aria-labelledby="event-about">
          <h2 id="event-about" className="section-title">
            Details
          </h2>
          <dl className="details__list">
            <div>
              <dt>When</dt>
              <dd>{formatEventWhen(event)}</dd>
            </div>
            <div>
              <dt>Place</dt>
              <dd>{event.venue ?? 'Not set yet'}</dd>
            </div>
            <div>
              <dt>Guests</dt>
              <dd>{event.guests_allowed ? 'Members may bring guests' : 'Members only'}</dd>
            </div>
            {event.budget && (
              <div>
                <dt>Budget</dt>
                <dd>
                  {can('finance.budget.view') ? (
                    <Link to="/finance/planning">{event.budget.title}</Link>
                  ) : (
                    event.budget.title
                  )}
                </dd>
              </div>
            )}
          </dl>
          {event.description && <p className="event-detail__description">{event.description}</p>}
        </section>

        <section className="card event-detail__side" aria-labelledby="event-answers">
          <h2 id="event-answers" className="section-title">
            Who is coming
          </h2>
          <dl className="details__list">
            <div>
              <dt>Coming</dt>
              <dd>
                {confirmed}
                {guests > 0 && (
                  <span className="table__muted">
                    {' '}
                    + {guests} guest{guests === 1 ? '' : 's'}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Can&apos;t make it</dt>
              <dd>{apologies}</dd>
            </div>
            <div>
              <dt>Not answered yet</dt>
              <dd>{pending}</dd>
            </div>
            <div>
              <dt>Invited</dt>
              <dd>
                {expected} member{expected === 1 ? '' : 's'}
              </dd>
            </div>
          </dl>
          <h3 className="details__subhead">Your answer</h3>
          <EventRsvp key={event.my_rsvp?.responded_at ?? 'none'} event={event} withGuests />
        </section>

        {event.hidden_from && event.hidden_from.length > 0 && (
          <section className="card event-detail__hidden" aria-labelledby="event-hidden">
            <div className="section-bar">
              <h2 id="event-hidden" className="section-title">
                Hidden from
              </h2>
              <HiddenBadge event={event} />
            </div>
            <p className="table__muted">{HIDDEN_EXPLAINER}</p>
            <ul className="event-hidden-list" role="list">
              {event.hidden_from.map((m) => (
                <li key={m.membership_id}>
                  <Avatar name={m.full_name} size="sm" /> {m.full_name}
                </li>
              ))}
            </ul>
            {!isOrganiser && (
              <p className="table__muted">
                Only the organiser, {event.created_by.full_name}, can change this list.
              </p>
            )}
          </section>
        )}
      </div>

      <EventFormDialog
        open={editing !== null}
        event={event}
        hiddenOnly={editing === 'hidden'}
        onClose={() => setEditing(null)}
        onSaved={(_saved, message) => {
          setEditing(null);
          onNotice(message);
        }}
      />

      <CancelEventDialog
        open={cancelling}
        event={event}
        onClose={() => setCancelling(false)}
        onDone={(message) => {
          setCancelling(false);
          onNotice(message);
        }}
      />
    </div>
  );
}

function CancelEventDialog({
  open,
  event,
  onClose,
  onDone,
}: {
  open: boolean;
  event: CommunityEvent;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const cancel = useCancelEvent();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!communityId) return;
    if (reason.trim().length < 3) {
      setError('Tell members why, in a few words.');
      return;
    }
    setError(null);
    cancel.mutate(
      { communityId, eventId: event.id, reason: reason.trim() },
      {
        onSuccess: () => onDone(`${event.title} was cancelled. Members can see the reason.`),
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
      onClose={onClose}
      title="Cancel event"
      subtitle="Members will see that it is cancelled, and why. This cannot be undone."
      icon={
        <IconTile tone="warning" round>
          <IconFlag />
        </IconTile>
      }
    >
      <div className="dialog__form">
        <Textarea
          label="Reason"
          rows={2}
          maxLength={255}
          placeholder="e.g. Venue unavailable, we will choose a new date."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        {error && <p className="form-error">{error}</p>}
        <div className="dialog__footer dialog__footer--flush">
          <Button variant="tint" onClick={onClose}>
            Keep event
          </Button>
          <Button variant="danger" disabled={cancel.isPending} onClick={submit}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel event'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
