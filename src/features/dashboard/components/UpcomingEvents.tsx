import { Panel } from '@/components/ui';

import type { UpcomingEvent } from '../data/placeholder';

interface UpcomingEventsProps {
  events: readonly UpcomingEvent[];
}

export function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <Panel
      title="Upcoming Events"
      action={
        // Disabled until the events screen exists — see QuickActions.
        <button type="button" className="panel__link" disabled>
          View All
        </button>
      }
    >
      <ul className="events" role="list">
        {events.map((event) => (
          <li key={event.id} className="events__item">
            <span className="events__date" aria-hidden="true">
              <span className="events__month">{event.month}</span>
              <span className="events__day">{event.day}</span>
            </span>
            <span className="events__body">
              <span className="events__title">{event.title}</span>
              <span className="events__meta">
                <span className="visually-hidden">
                  {event.month} {event.day},{' '}
                </span>
                {event.time} · {event.location}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
