import { useState } from 'react';

import { Button, IconUserCheck, IconUserOff, Input } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';

import { MAX_GUESTS, myRsvpLabel, useRsvp } from '../api/events';
import type { CommunityEvent, RsvpResponse } from '../api/events';

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
