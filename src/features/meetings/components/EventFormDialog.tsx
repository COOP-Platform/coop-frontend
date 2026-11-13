import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  IconCalendar,
  IconEyeOff,
  IconTile,
  Input,
  LoadingState,
  Select,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { EVENT_TYPES, useCreateEvent, useUpdateEvent } from '../api/events';
import type { CommunityEvent, EventInput, EventMemberRef, EventType } from '../api/events';

/** ISO -> the value a datetime-local input wants, in the browser's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO 8601 (UTC). */
function toIso(local: string): string {
  return new Date(local).toISOString();
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

export const HIDDEN_EXPLAINER =
  "Hidden members won't see this event, its RSVP list or its budget. Use it for a surprise.";

/**
 * Create or edit an event. `hiddenOnly` edits nothing but who the event is
 * hidden from: the one change the backend allows on a cancelled event.
 */
export function EventFormDialog({
  open,
  event,
  hiddenOnly = false,
  onClose,
  onSaved,
}: {
  open: boolean;
  event: CommunityEvent | null;
  hiddenOnly?: boolean;
  onClose: () => void;
  onSaved: (saved: CommunityEvent, message: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={hiddenOnly ? 'Who can see this event' : event ? 'Edit event' : 'Create event'}
      subtitle={
        hiddenOnly
          ? HIDDEN_EXPLAINER
          : 'A celebration, a fundraiser, a visit: anything the family gathers for that is not a meeting.'
      }
      icon={
        <IconTile tone="brand" round>
          {hiddenOnly ? <IconEyeOff /> : <IconCalendar />}
        </IconTile>
      }
    >
      {open && (
        <EventForm event={event} hiddenOnly={hiddenOnly} onClose={onClose} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function EventForm({
  event,
  hiddenOnly,
  onClose,
  onSaved,
}: {
  event: CommunityEvent | null;
  hiddenOnly: boolean;
  onClose: () => void;
  onSaved: (saved: CommunityEvent, message: string) => void;
}) {
  const { communityId, membership, can } = useWorkspace();
  const create = useCreateEvent();
  const update = useUpdateEvent();

  const organiserId = event ? event.created_by.membership_id : membership?.id;
  const isOrganiser = event === null || event.created_by.membership_id === membership?.id;
  // The backend: hiding needs event.visibility.manage, and once the event
  // exists only its organiser may change the list.
  const canChooseHidden = can('event.visibility.manage') && isOrganiser;
  const initialHidden = useMemo(
    () => (event?.hidden_from ?? []).map((m) => m.membership_id),
    [event],
  );

  const [title, setTitle] = useState(event?.title ?? '');
  const [type, setType] = useState<EventType>(event?.event_type ?? 'celebration');
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.ends_at ?? null));
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [guestsAllowed, setGuestsAllowed] = useState(event?.guests_allowed ?? false);
  const [hidden, setHidden] = useState<string[]>(initialHidden);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const busy = create.isPending || update.isPending;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!communityId) return;

    const problems: Record<string, string> = {};
    if (!hiddenOnly) {
      if (title.trim().length < 3) problems.title = 'Give the event a name of at least 3 letters.';
      const startChanged = !event || toLocalInput(event.starts_at) !== startsAt;
      if (!startsAt) problems.starts_at = 'Choose when the event starts.';
      else if (startChanged && new Date(startsAt).getTime() <= Date.now())
        problems.starts_at = 'An event must start in the future.';
      if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt))
        problems.ends_at = 'The end must be after the start.';
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const full: Omit<EventInput, 'communityId'> = hiddenOnly
      ? {}
      : {
          title: title.trim(),
          event_type: type,
          starts_at: toIso(startsAt),
          ends_at: endsAt ? toIso(endsAt) : null,
          venue: venue.trim() || null,
          description: description.trim() || null,
          guests_allowed: guestsAllowed,
        };

    let body: Omit<EventInput, 'communityId'>;
    if (event) {
      // Send only what changed.
      body = {};
      if (!hiddenOnly) {
        if (full.title !== event.title) body.title = full.title;
        if (full.event_type !== event.event_type) body.event_type = full.event_type;
        if (startsAt !== toLocalInput(event.starts_at)) body.starts_at = full.starts_at;
        if (endsAt !== toLocalInput(event.ends_at)) body.ends_at = full.ends_at;
        if (full.venue !== event.venue) body.venue = full.venue;
        if (full.description !== event.description) body.description = full.description;
        if (full.guests_allowed !== event.guests_allowed) body.guests_allowed = full.guests_allowed;
      }
      if (canChooseHidden && !sameSet(hidden, initialHidden)) body.hidden_from_member_ids = hidden;
      if (Object.keys(body).length === 0) {
        onClose();
        return;
      }
    } else {
      body = {
        ...full,
        ...(canChooseHidden && hidden.length > 0 ? { hidden_from_member_ids: hidden } : {}),
      };
    }

    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      const known = ['title', 'event_type', 'starts_at', 'ends_at', 'venue', 'description'];
      const hiddenError = f.hidden_from_member_ids;
      setErrors({
        ...Object.fromEntries(known.map((k) => [k, f[k]])),
        hidden: hiddenError,
        form:
          known.some((k) => f[k]) || hiddenError
            ? undefined
            : error instanceof ApiError && error.code === 'event_not_editable'
              ? 'This event is cancelled, so its details can no longer change.'
              : error instanceof ApiError && error.code === 'not_event_organiser'
                ? "Only the event's organiser can change who it is hidden from."
                : errorMessage(error),
      });
    };

    const name = full.title ?? event?.title ?? 'The event';
    if (event) {
      update.mutate(
        { communityId, eventId: event.id, ...body },
        { onSuccess: (saved) => onSaved(saved, `${name} saved.`), onError },
      );
    } else {
      create.mutate(
        { communityId, ...body },
        { onSuccess: (saved) => onSaved(saved, `${name} created.`), onError },
      );
    }
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      {!hiddenOnly && (
        <>
          <Input
            label="Name"
            placeholder="e.g. Annual cousins celebration"
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={errors.title}
            required
          />
          <Select
            label="Kind of event"
            options={EVENT_TYPES}
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            error={errors.event_type}
          />
          <div className="form-row">
            <Input
              label="Starts"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              error={errors.starts_at}
              required
            />
            <Input
              label="Ends"
              optional
              type="datetime-local"
              value={endsAt}
              min={startsAt || undefined}
              onChange={(e) => setEndsAt(e.target.value)}
              error={errors.ends_at}
            />
          </div>
          <Input
            label="Place"
            optional
            placeholder="e.g. Community Hall, Kigali"
            maxLength={255}
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            error={errors.venue}
          />
          <Textarea
            label="Details"
            optional
            rows={3}
            maxLength={5000}
            placeholder="What will happen, what to bring…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Checkbox
            label="Members may bring guests"
            checked={guestsAllowed}
            onChange={(e) => setGuestsAllowed(e.target.checked)}
          />
          {event && event.guests_allowed && !guestsAllowed && (
            <p className="table__muted">
              Members who said they would bring guests will be counted as coming alone.
            </p>
          )}
        </>
      )}

      {canChooseHidden ? (
        <HiddenMembersPicker
          selected={hidden}
          onChange={setHidden}
          organiserId={organiserId}
          alreadyHidden={event?.hidden_from ?? []}
          error={errors.hidden}
          showExplainer={!hiddenOnly}
        />
      ) : (
        event &&
        event.hidden_from &&
        event.hidden_from.length > 0 && (
          <p className="details__note event-form__hidden-note">
            Hidden from {event.hidden_from.map((m) => m.full_name).join(', ')}. Only the organiser,{' '}
            {event.created_by.full_name}, can change this.
          </p>
        )
      )}

      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : event ? 'Save' : 'Create event'}
        </Button>
      </div>
    </form>
  );
}

function HiddenMembersPicker({
  selected,
  onChange,
  organiserId,
  alreadyHidden,
  error,
  showExplainer,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  organiserId: string | undefined;
  alreadyHidden: EventMemberRef[];
  error: string | undefined;
  showExplainer: boolean;
}) {
  const { communityId } = useWorkspace();
  const members = useMemberships(communityId, 'active');

  const options = useMemo(() => {
    const list = (members.data ?? [])
      .filter((m) => m.id !== organiserId)
      .map((m) => ({ id: m.id, name: m.full_name ?? 'Member' }));
    // A member already hidden may have left or been suspended since; the
    // backend lets them stay on the list, so keep them pickable.
    for (const m of alreadyHidden) {
      if (!list.some((o) => o.id === m.membership_id))
        list.push({ id: m.membership_id, name: `${m.full_name} (no longer active)` });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [members.data, organiserId, alreadyHidden]);

  function toggle(id: string, on: boolean) {
    onChange(on ? [...selected, id] : selected.filter((x) => x !== id));
  }

  return (
    <fieldset className="event-hidden-picker">
      <legend className="field__label">
        <IconEyeOff width={16} height={16} aria-hidden="true" /> Hide from members{' '}
        <span className="field__optional">(Optional)</span>
      </legend>
      {showExplainer && <p className="table__muted">{HIDDEN_EXPLAINER}</p>}
      {members.data === undefined ? (
        members.isPending ? (
          <LoadingState label="Loading members…" />
        ) : (
          <p className="form-error">{errorMessage(members.error)}</p>
        )
      ) : options.length === 0 ? (
        <p className="table__muted">There are no other members to hide it from.</p>
      ) : (
        <div className="event-hidden-picker__list">
          {options.map((o) => (
            <Checkbox
              key={o.id}
              label={o.name}
              checked={selected.includes(o.id)}
              onChange={(e) => toggle(o.id, e.target.checked)}
            />
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <p className="table__muted">
          Hidden from {selected.length} member{selected.length === 1 ? '' : 's'}.
        </p>
      )}
      {error && <p className="field__error">{error}</p>}
    </fieldset>
  );
}
