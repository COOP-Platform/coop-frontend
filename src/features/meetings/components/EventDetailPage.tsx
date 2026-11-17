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
  IconClock,
  IconEyeOff,
  IconFlag,
  IconLock,
  IconMapPin,
  IconPencil,
  IconTile,
  LoadingState,
  PageHeader,
  SectionCard,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/date';

import { eventTypeLabel, formatEventWhen, useCancelEvent, useEvent } from '../api/events';
import type { CommunityEventDetail } from '../api/events';
import { EventBudget, EventBudgetStats } from './EventBudget';
import { EventFormDialog } from './EventFormDialog';
import { EventResponses, EventRsvp } from './EventRsvp';
import { EventStatusBadge, HiddenBadge } from './EventsPage';

function BackLink() {
  return (
    <Link to="/meetings/events" className="event-detail__back">
      <IconArrowLeft width={16} height={16} aria-hidden="true" /> Events
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
  event: CommunityEventDetail;
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
  const { confirmed, apologies, expected, guests } = event.rsvp;

  return (
    <div className="page">
      <BackLink />
      <PageHeader
        title={event.title}
        badge={<EventStatusBadge event={event} />}
        subtitle={
          <span className="event-detail__meta">
            <span>
              <IconClock width={16} height={16} aria-hidden="true" /> {formatEventWhen(event)}
            </span>
            {event.venue && (
              <span>
                <IconMapPin width={16} height={16} aria-hidden="true" /> {event.venue}
              </span>
            )}
          </span>
        }
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
          <p className="notice__text">{notice}</p>
        </div>
      )}

      {event.status === 'cancelled' && (
        <div className="notice notice--warning" role="status">
          <IconBan width={20} height={20} aria-hidden="true" />
          <div>
            <p className="notice__title">
              Cancelled{event.cancelled_at ? ` on ${formatLongDate(event.cancelled_at)}` : ''}
            </p>
            {event.cancel_reason && <p className="notice__text">{event.cancel_reason}</p>}
          </div>
        </div>
      )}

      <EventBudgetStats event={event} />

      <div className="event-detail">
        <SectionCard title="Details">
          <dl className="event-kv">
            <dt>When</dt>
            <dd>{formatEventWhen(event)}</dd>
            <dt>Place</dt>
            <dd>{event.venue ?? 'Not set'}</dd>
            <dt>Type</dt>
            <dd>{eventTypeLabel(event.event_type)}</dd>
            <dt>Guests</dt>
            <dd>{event.guests_allowed ? 'Allowed' : 'Members only'}</dd>
            <dt>Organiser</dt>
            <dd>{event.created_by.full_name}</dd>
          </dl>
          {event.description && <p className="event-detail__description">{event.description}</p>}
        </SectionCard>

        <SectionCard
          title="Who is coming"
          className="event-coming"
          footer={
            <EventRsvp key={event.my_rsvp?.responded_at ?? 'none'} event={event} withGuests />
          }
        >
          <dl className="event-counts">
            <div>
              <dt>Invited</dt>
              <dd>{expected}</dd>
            </div>
            <div>
              <dt>Yes{guests > 0 ? ` · +${guests} guest${guests === 1 ? '' : 's'}` : ''}</dt>
              <dd className="event-counts__yes">{confirmed}</dd>
            </div>
            <div>
              <dt>No</dt>
              <dd className="event-counts__no">{apologies}</dd>
            </div>
          </dl>
        </SectionCard>

        <EventBudget event={event} />

        <EventResponses event={event} />

        {event.hidden_from && event.hidden_from.length > 0 && (
          <SectionCard
            title="Hidden from"
            className="event-detail__wide"
            actions={<HiddenBadge event={event} />}
            footer={
              !isOrganiser ? (
                <span className="table__muted">
                  Only {event.created_by.full_name} can change this.
                </span>
              ) : undefined
            }
          >
            <ul className="event-hidden-list" role="list">
              {event.hidden_from.map((m) => (
                <li key={m.membership_id}>
                  <Avatar name={m.full_name} size="sm" /> {m.full_name}
                </li>
              ))}
            </ul>
          </SectionCard>
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
  event: CommunityEventDetail;
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
        onSuccess: () => onDone(`${event.title} was cancelled.`),
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
      subtitle="Members will see it is cancelled, and why. This cannot be undone."
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
