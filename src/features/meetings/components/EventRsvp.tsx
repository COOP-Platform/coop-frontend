import { useState } from 'react';

import { Avatar, Badge, Button, IconUserCheck, IconUserOff, Input } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { MAX_GUESTS, myRsvpLabel, useRsvp } from '../api/events';
import type { CommunityEvent, CommunityEventDetail, RsvpResponse } from '../api/events';

/**
 * The caller's answer to an event, with the two buttons to give or change it.
 * Shown only to members with event.rsvp, and only while the event is upcoming
 * (the backend refuses answers to past or cancelled events). With `withGuests`,
 * a member coming to an event that allows guests can say how many they bring.
 */
export function EventRsvp({
  event,
  withGuests = false,
}: {
  event: CommunityEvent;
  withGuests?: boolean;
}) {
  const { communityId, can } = useWorkspace();
  const rsvp = useRsvp();
  const mine = event.my_rsvp;
  const [guests, setGuests] = useState(String(mine?.response === 'confirmed' ? mine.guests : 0));
  const [guestError, setGuestError] = useState<string | null>(null);

  if (!can('event.rsvp') || event.status !== 'scheduled') {
    return <p className="event-rsvp__mine">{myRsvpLabel(event)}</p>;
  }

  const showGuests = withGuests && event.guests_allowed;

  function answer(response: RsvpResponse) {
    if (!communityId) return;
    let count = 0;
    if (response === 'confirmed') {
      if (showGuests) {
        count = Number(guests || '0');
        if (!Number.isInteger(count) || count < 0 || count > MAX_GUESTS) {
          setGuestError(`Enter a number of guests from 0 to ${MAX_GUESTS}.`);
          return;
        }
      } else if (mine?.response === 'confirmed' && event.guests_allowed) {
        // A quick "Attending" keeps the guests already given.
        count = mine.guests;
      }
    }
    setGuestError(null);
    rsvp.mutate({ communityId, eventId: event.id, response, guests: count });
  }

  const attending = mine?.response === 'confirmed';
  const apology = mine?.response === 'apology';

  return (
    <div className="event-rsvp">
      <p className="event-rsvp__mine">{myRsvpLabel(event)}</p>
      {showGuests && (
        <Input
          label="Guests you bring"
          type="number"
          min={0}
          max={MAX_GUESTS}
          step={1}
          className="event-rsvp__guests"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          error={guestError ?? undefined}
          hint="Leave at 0 if you come alone."
        />
      )}
      <div className="event-rsvp__buttons" role="group" aria-label="Your answer">
        <Button
          size="sm"
          inline
          variant={attending ? 'primary' : 'secondary'}
          icon={<IconUserCheck />}
          aria-pressed={attending}
          disabled={rsvp.isPending}
          onClick={() => answer('confirmed')}
        >
          {attending && showGuests ? 'Update' : 'Attending'}
        </Button>
        <Button
          size="sm"
          inline
          variant={apology ? 'primary' : 'secondary'}
          icon={<IconUserOff />}
          aria-pressed={apology}
          disabled={rsvp.isPending}
          onClick={() => answer('apology')}
        >
          Can&apos;t make it
        </Button>
      </div>
      {rsvp.error && <p className="form-error">{errorMessage(rsvp.error)}</p>}
    </div>
  );
}

/**
 * Who answered, by name (event detail only). Members see who is coming; the
 * organiser and event managers also see who sent apologies. Members the event
 * is hidden from are never listed (the API leaves them out).
 */
export function EventResponses({ event }: { event: CommunityEventDetail }) {
  const coming = event.responses.filter((r) => r.response === 'confirmed');
  const apologies = event.responses.filter((r) => r.response === 'apology');
  const showApologies = event.responses_include_apologies;

  return (
    <section className="card event-detail__answers" aria-labelledby="event-who">
      <h2 id="event-who" className="section-title">
        {showApologies ? 'Who answered' : 'Who is coming'}
      </h2>
      {event.responses.length === 0 ? (
        <p className="table__muted">Nobody has answered yet.</p>
      ) : (
        <div className="event-answers">
          <div>
            <h3 className="details__subhead">
              Coming <Badge tone="success">{coming.length}</Badge>
            </h3>
            {coming.length === 0 ? (
              <p className="table__muted">Nobody has said they are coming yet.</p>
            ) : (
              <ul className="event-answer-list" role="list">
                {coming.map((r) => (
                  <li key={r.membership_id}>
                    <Avatar name={r.full_name} size="sm" />
                    <span>{r.full_name}</span>
                    {r.guests > 0 && (
                      <span className="table__muted">
                        + {r.guests} guest{r.guests === 1 ? '' : 's'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {showApologies && (
            <div>
              <h3 className="details__subhead">
                Can&apos;t make it <Badge tone="neutral">{apologies.length}</Badge>
              </h3>
              {apologies.length === 0 ? (
                <p className="table__muted">No apologies so far.</p>
              ) : (
                <ul className="event-answer-list" role="list">
                  {apologies.map((r) => (
                    <li key={r.membership_id}>
                      <Avatar name={r.full_name} size="sm" />
                      <span>{r.full_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
