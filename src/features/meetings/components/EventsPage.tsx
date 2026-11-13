import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconEyeOff,
  IconMapPin,
  IconPlus,
  IconUsers,
  LoadingState,
  PageHeader,
  SegmentedControl,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { eventTypeLabel, formatEventWhen, rsvpSummary, useEvents } from '../api/events';
import type { CommunityEvent, EventListFilter } from '../api/events';
import { EventFormDialog } from './EventFormDialog';
import { EventRsvp } from './EventRsvp';

export type EventsTab = 'upcoming' | 'past' | 'cancelled';

const TABS: { value: EventsTab; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

const FILTER: Record<EventsTab, EventListFilter> = {
  upcoming: 'upcoming',
  past: 'completed',
  cancelled: 'cancelled',
};

const EMPTY: Record<EventsTab, { title: string; message: string }> = {
  upcoming: {
    title: 'No upcoming events',
    message: 'Celebrations, fundraisers and visits planned by the family will show here.',
  },
  past: { title: 'No past events yet', message: 'Events that have taken place will show here.' },
  cancelled: { title: 'No cancelled events', message: 'Good news: nothing has been called off.' },
};

export function EventStatusBadge({ event }: { event: CommunityEvent }) {
  if (event.status === 'cancelled') return <Badge tone="danger">Cancelled</Badge>;
  if (event.status === 'completed') return <Badge tone="neutral">Past</Badge>;
  return <Badge tone="success">Upcoming</Badge>;
}

/** Only the organiser and visibility managers receive `hidden_from`. */
export function HiddenBadge({ event }: { event: CommunityEvent }) {
  const count = event.hidden_from?.length ?? 0;
  if (count === 0) return null;
  return (
    <Badge tone="warning" icon={<IconEyeOff width={12} height={12} />}>
      Hidden from {count} member{count === 1 ? '' : 's'}
    </Badge>
  );
}

/**
 * Events (S3-12): gatherings that are not meetings. Every member sees the
 * events they are not hidden from and answers them; event.create plans new
 * ones, and event.visibility.manage may hide one from chosen members.
 */
export function EventsPage({
  tab,
  onTabChange,
}: {
  tab: EventsTab;
  onTabChange: (tab: EventsTab) => void;
}) {
  const { communityId, can } = useWorkspace();
  const navigate = useNavigate();
  const events = useEvents(communityId, FILTER[tab]);
  const [creating, setCreating] = useState(false);

  return (
    <div className="page">
      <PageHeader
        title="Events"
        subtitle="Celebrations, fundraisers and visits: tell the family whether you are coming."
        actions={
          can('event.create') ? (
            <Button inline icon={<IconPlus />} onClick={() => setCreating(true)}>
              Create event
            </Button>
          ) : undefined
        }
      />
      <SegmentedControl label="Which events" options={TABS} value={tab} onChange={onTabChange} />

      {events.data === undefined ? (
        events.isPending ? (
          <LoadingState label="Loading events…" />
        ) : (
          <ErrorState message={errorMessage(events.error)} />
        )
      ) : events.data.items.length === 0 ? (
        <section className="card">
          <EmptyState icon={<IconCalendar />} {...EMPTY[tab]} />
        </section>
      ) : (
        <ul className="budget-cards event-cards" role="list">
          {events.data.items.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}

      <EventFormDialog
        open={creating}
        event={null}
        onClose={() => setCreating(false)}
        onSaved={(saved) => {
          setCreating(false);
          void navigate({ to: '/meetings/events/$eventId', params: { eventId: saved.id } });
        }}
      />
    </div>
  );
}

function EventCard({ event }: { event: CommunityEvent }) {
  return (
    <article className="card budget-card budget-card--static event-card">
      <div className="budget-card__head">
        <span className="event-card__type">{eventTypeLabel(event.event_type)}</span>
        <EventStatusBadge event={event} />
      </div>
      <h3 className="budget-card__title">
        <Link
          to="/meetings/events/$eventId"
          params={{ eventId: event.id }}
          className="event-card__link"
        >
          {event.title}
        </Link>
      </h3>
      <p className="event-card__meta">
        <IconClock width={14} height={14} aria-hidden="true" /> {formatEventWhen(event)}
      </p>
      {event.venue && (
        <p className="event-card__meta">
          <IconMapPin width={14} height={14} aria-hidden="true" /> {event.venue}
        </p>
      )}
      {event.status === 'cancelled' ? (
        event.cancel_reason && <p className="event-card__meta">Reason: {event.cancel_reason}</p>
      ) : (
        <p className="event-card__meta">
          <IconUsers width={14} height={14} aria-hidden="true" /> {rsvpSummary(event)}
        </p>
      )}
      <HiddenBadge event={event} />
      {event.status === 'completed' && event.my_rsvp?.response === 'confirmed' && (
        <p className="event-card__meta">
          <IconCheckCircle width={14} height={14} aria-hidden="true" /> You said you would come
        </p>
      )}
      {event.status === 'scheduled' && <EventRsvp event={event} />}
    </article>
  );
}
