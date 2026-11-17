import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconCalendar,
  IconEyeOff,
  IconPlus,
  LoadingState,
  PageHeader,
  SectionCard,
  Select,
  TableFooter,
  usePaged,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { eventTypeLabel, useEvents } from '../api/events';
import type { CommunityEvent, EventListFilter } from '../api/events';
import { formatMeetingDay, formatMeetingTime } from '../api/meetings';
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

const EMPTY: Record<EventsTab, string> = {
  upcoming: 'No upcoming events',
  past: 'No past events',
  cancelled: 'No cancelled events',
};

export function EventStatusBadge({ event }: { event: CommunityEvent }) {
  if (event.status === 'cancelled') return <Badge tone="danger">Cancelled</Badge>;
  if (event.status === 'completed') return <Badge tone="neutral">Past</Badge>;
  return <Badge tone="info">Upcoming</Badge>;
}

/** Only the organiser and visibility managers receive `hidden_from`. */
export function HiddenBadge({ event }: { event: CommunityEvent }) {
  const count = event.hidden_from?.length ?? 0;
  if (count === 0) return null;
  return (
    <Badge tone="warning" icon={<IconEyeOff width={12} height={12} />}>
      Hidden from {count}
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
  // Members see each event and its report; who is coming is for organisers.
  const organises = can('event.create') || can('event.update');
  const navigate = useNavigate();
  const events = useEvents(communityId, FILTER[tab]);
  const [creating, setCreating] = useState(false);
  const paged = usePaged(events.data?.items ?? []);

  return (
    <div className="page">
      <PageHeader
        title="Events"
        actions={
          can('event.create') ? (
            <Button inline icon={<IconPlus />} onClick={() => setCreating(true)}>
              Create event
            </Button>
          ) : undefined
        }
      />

      <SectionCard
        title={`${TABS.find((t) => t.value === tab)?.label ?? ''} events`}
        flush
        actions={
          <Select
            label="Which events"
            labelHidden
            options={TABS}
            value={tab}
            onChange={(e) => onTabChange(e.target.value as EventsTab)}
          />
        }
        footer={
          events.data && events.data.items.length > 0 ? (
            <TableFooter {...paged} onPage={paged.setPage} />
          ) : undefined
        }
      >
        {events.data === undefined ? (
          events.isPending ? (
            <LoadingState label="Loading events…" />
          ) : (
            <ErrorState message={errorMessage(events.error)} />
          )
        ) : events.data.items.length === 0 ? (
          <EmptyState icon={<IconCalendar />} title={EMPTY[tab]} />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">When</th>
                  <th scope="col">Place</th>
                  {organises && (
                    <>
                      <th scope="col" className="num">
                        Yes
                      </th>
                      <th scope="col" className="num">
                        No
                      </th>
                    </>
                  )}
                  <th scope="col">Status</th>
                  {organises && <th scope="col">You</th>}
                </tr>
              </thead>
              <tbody>
                {paged.rows.map((event) => (
                  <EventRow key={event.id} event={event} organises={organises} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

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

function EventRow({ event, organises }: { event: CommunityEvent; organises: boolean }) {
  const { confirmed, apologies, guests } = event.rsvp;
  const cancelled = event.status === 'cancelled';
  return (
    <tr>
      <td>
        <span className="table__stack">
          <Link
            to="/meetings/events/$eventId"
            params={{ eventId: event.id }}
            className="event-row__link"
          >
            {event.title}
          </Link>
          <span className="table__muted">
            {cancelled && event.cancel_reason
              ? event.cancel_reason
              : eventTypeLabel(event.event_type)}
          </span>
        </span>
      </td>
      <td className="event-row__when">
        {formatMeetingDay(event.starts_at)} · {formatMeetingTime(event.starts_at)}
      </td>
      <td>{event.venue ?? <span className="table__muted">—</span>}</td>
      {organises && (
        <>
          <td className="num">
            {cancelled ? '—' : confirmed}
            {!cancelled && guests > 0 && <span className="table__muted"> +{guests}</span>}
          </td>
          <td className="num">{cancelled ? '—' : apologies}</td>
        </>
      )}
      <td>
        <span className="event-row__badges">
          <EventStatusBadge event={event} />
          <HiddenBadge event={event} />
        </span>
      </td>
      {organises && (
        <td>
          {event.status === 'scheduled' ? (
            <EventRsvp event={event} compact />
          ) : (
            <span className="table__muted">
              {cancelled || !event.my_rsvp
                ? '—'
                : event.my_rsvp.response === 'confirmed'
                  ? 'Said yes'
                  : 'Said no'}
            </span>
          )}
        </td>
      )}
    </tr>
  );
}
