import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  Dialog,
  IconCalendar,
  IconPlus,
  IconTile,
  IconTrash,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import {
  MEETING_TYPE_LABELS,
  listFieldErrors,
  useScheduleMeeting,
  useUpdateMeeting,
} from '../api/meetings';
import type { AgendaItemInput, MeetingDetail, MeetingInput, MeetingType } from '../api/meetings';

/** The backend's cap on agenda items. */
const MAX_AGENDA_ITEMS = 50;

const TYPE_OPTIONS = (Object.keys(MEETING_TYPE_LABELS) as MeetingType[]).map((value) => ({
  value,
  label: MEETING_TYPE_LABELS[value],
}));

/** Schedule a new meeting (meeting === null) or edit one, with its agenda. */
export function MeetingFormDialog({
  open,
  meeting,
  onClose,
  onSaved,
}: {
  open: boolean;
  meeting: MeetingDetail | null;
  onClose: () => void;
  /** Called with the saved meeting and a sentence to show. */
  onSaved: (saved: MeetingDetail, message: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={meeting ? 'Edit meeting' : 'Schedule a meeting'}
      subtitle="Say when and where it is, and what will be discussed. Members see it straight away."
      icon={
        <IconTile tone="brand" round>
          <IconCalendar />
        </IconTile>
      }
    >
      {open && <MeetingForm meeting={meeting} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

interface AgendaDraft {
  key: number;
  id?: string;
  title: string;
  description: string;
  presenterId: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Minutes from "HH:MM" to "HH:MM" on the same day; null when either is missing. */
function minutesBetween(start: string, end: string): number | null {
  if (!start || !end) return null;
  const toMinutes = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  return toMinutes(end) - toMinutes(start);
}

let nextKey = 1;

function MeetingForm({
  meeting,
  onClose,
  onSaved,
}: {
  meeting: MeetingDetail | null;
  onClose: () => void;
  onSaved: (saved: MeetingDetail, message: string) => void;
}) {
  const { communityId } = useWorkspace();
  const members = useMemberships(communityId, 'active');
  const schedule = useScheduleMeeting();
  const update = useUpdateMeeting();
  const busy = schedule.isPending || update.isPending;

  const start = meeting ? new Date(meeting.scheduled_at) : null;
  const end = meeting?.ends_at ? new Date(meeting.ends_at) : null;

  const [title, setTitle] = useState(meeting?.title ?? '');
  const [type, setType] = useState<MeetingType>(meeting?.meeting_type ?? 'general');
  const [date, setDate] = useState(start ? localDate(start) : '');
  const [startTime, setStartTime] = useState(start ? localTime(start) : '');
  const [endTime, setEndTime] = useState(end ? localTime(end) : '');
  const [location, setLocation] = useState(meeting?.location ?? '');
  const [onlineLink, setOnlineLink] = useState(meeting?.online_link ?? '');
  const [description, setDescription] = useState(meeting?.description ?? '');
  const [agenda, setAgenda] = useState<AgendaDraft[]>(
    meeting
      ? meeting.agenda.map((item) => ({
          key: nextKey++,
          id: item.id,
          title: item.title,
          description: item.description ?? '',
          presenterId: item.presenter?.membership_id ?? '',
        }))
      : [],
  );
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [agendaErrors, setAgendaErrors] = useState<Record<number, string>>({});

  const presenterOptions = [
    { value: '', label: 'No presenter' },
    ...(members.data ?? []).map((m) => ({
      value: m.id,
      label: m.full_name ?? m.email ?? 'Member',
    })),
    // A presenter who is no longer active stays selectable on edit.
    ...(meeting?.agenda ?? [])
      .map((item) => item.presenter)
      .filter(
        (p): p is NonNullable<typeof p> =>
          p !== null && !(members.data ?? []).some((m) => m.id === p.membership_id),
      )
      .map((p) => ({ value: p.membership_id, label: p.full_name })),
  ].filter((option, index, all) => all.findIndex((o) => o.value === option.value) === index);

  function setItem(key: number, patch: Partial<AgendaDraft>) {
    setAgenda((all) => all.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function move(index: number, by: -1 | 1) {
    setAgenda((all) => {
      const next = [...all];
      const [item] = next.splice(index, 1);
      if (item) next.splice(index + by, 0, item);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Record<string, string> = {};
    const rowProblems: Record<number, string> = {};

    if (title.trim().length < 3)
      problems.title = 'Give the meeting a title of at least 3 characters.';
    if (!date) problems.date = 'Choose the day of the meeting.';
    if (!startTime) problems.startTime = 'Choose when it starts.';

    const scheduled = date && startTime ? new Date(`${date}T${startTime}`) : null;
    const toMinute = (d: Date) => Math.floor(d.getTime() / 60_000);
    const timeChanged = !meeting || !start || !scheduled || toMinute(scheduled) !== toMinute(start);
    if (scheduled && timeChanged && scheduled.getTime() <= Date.now()) {
      problems.date = 'A meeting must be scheduled in the future.';
    }

    const duration = minutesBetween(startTime, endTime);
    if (duration !== null && duration <= 0) problems.endTime = 'It must end after it starts.';

    const link = onlineLink.trim();
    if (link && !/^https?:\/\/\S+\.\S+/i.test(link)) {
      problems.onlineLink = 'Paste the full link, starting with https://';
    }

    agenda.forEach((item, index) => {
      // An agenda item without a title is refused (and has crashed the server).
      if (!item.title.trim()) rowProblems[index] = 'Give this item a title.';
    });
    if (agenda.length > MAX_AGENDA_ITEMS) {
      problems.agenda = `An agenda can have at most ${MAX_AGENDA_ITEMS} items.`;
    }

    setErrors(problems);
    setAgendaErrors(rowProblems);
    if (
      Object.keys(problems).length > 0 ||
      Object.keys(rowProblems).length > 0 ||
      !communityId ||
      !scheduled
    ) {
      return;
    }

    const agendaBody: AgendaItemInput[] = agenda.map((item) => ({
      ...(item.id ? { id: item.id } : {}),
      title: item.title.trim(),
      description: item.description.trim() || null,
      presenter_id: item.presenterId || null,
    }));
    const body: MeetingInput = {
      title: title.trim(),
      meeting_type: type,
      description: description.trim() || null,
      location: location.trim() || null,
      online_link: link || null,
      agenda: agendaBody,
    };
    // On edit, a start that did not move is left out: the backend checks a
    // changed start is in the future, and an unchanged one may be past.
    if (timeChanged) body.scheduled_at = scheduled.toISOString();
    if (!meeting || duration !== (meeting.duration_minutes ?? null)) {
      body.duration_minutes = duration;
    }

    const onError = (error: unknown) => {
      const f = error instanceof ApiError ? error.fieldErrors : {};
      const nested = listFieldErrors(error, 'agenda');
      setAgendaErrors(nested.rows);
      const shown = {
        title: f.title,
        date: f.scheduled_at,
        endTime: f.duration_minutes,
        onlineLink: f.online_link,
        location: f.location,
        description: f.description,
        agenda:
          nested.whole ??
          (Object.keys(nested.rows).length > 0
            ? 'Check the agenda items marked above.'
            : undefined),
      };
      const placed = Object.values(shown).some((message) => message !== undefined);
      setErrors({ ...shown, form: placed ? undefined : errorMessage(error) });
    };

    if (meeting) {
      update.mutate(
        { ...body, communityId, meetingId: meeting.id },
        { onSuccess: (saved) => onSaved(saved, `${saved.title} saved.`), onError },
      );
    } else {
      schedule.mutate(
        { ...body, communityId },
        {
          onSuccess: (saved) => onSaved(saved, `${saved.title} is scheduled.`),
          onError,
        },
      );
    }
  }

  return (
    <form className="dialog__form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Title"
        placeholder="e.g. Monthly family meeting"
        maxLength={160}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={errors.title}
        required
      />
      <Select
        label="Kind of meeting"
        options={TYPE_OPTIONS}
        value={type}
        onChange={(event) => setType(event.target.value as MeetingType)}
      />
      <Input
        label="Day"
        type="date"
        min={localDate(new Date())}
        value={date}
        onChange={(event) => setDate(event.target.value)}
        error={errors.date}
        required
      />
      <div className="form-row">
        <Input
          label="Starts at"
          type="time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          error={errors.startTime}
          required
        />
        <Input
          label="Ends at"
          optional
          type="time"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          error={errors.endTime}
        />
      </div>
      <Input
        label="Place"
        optional
        placeholder="e.g. Grandma's house, Kicukiro"
        maxLength={255}
        value={location}
        onChange={(event) => setLocation(event.target.value)}
        error={errors.location}
      />
      <Input
        label="Online link"
        optional
        type="url"
        placeholder="https://meet.google.com/…"
        maxLength={500}
        value={onlineLink}
        onChange={(event) => setOnlineLink(event.target.value)}
        error={errors.onlineLink}
        hint="For members joining by video call."
      />
      <Textarea
        label="Description"
        optional
        rows={2}
        maxLength={2000}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={errors.description}
      />

      <fieldset className="agenda-editor">
        <legend className="field__label">Agenda</legend>
        {agenda.length === 0 && (
          <p className="table__muted">No items yet. Add what the meeting will discuss.</p>
        )}
        <ol className="agenda-editor__list">
          {agenda.map((item, index) => (
            <li key={item.key} className="agenda-editor__item">
              <div className="agenda-editor__row">
                <span className="agenda-editor__number" aria-hidden="true">
                  {index + 1}
                </span>
                <Input
                  label={`Item ${index + 1} title`}
                  labelHidden
                  placeholder="e.g. Review of the month's contributions"
                  maxLength={200}
                  value={item.title}
                  onChange={(event) => setItem(item.key, { title: event.target.value })}
                  error={agendaErrors[index]}
                />
                <div className="agenda-editor__buttons">
                  <Button
                    variant="tint"
                    size="sm"
                    inline
                    aria-label={`Move item ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="tint"
                    size="sm"
                    inline
                    aria-label={`Move item ${index + 1} down`}
                    disabled={index === agenda.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    variant="tint"
                    size="sm"
                    inline
                    icon={<IconTrash />}
                    aria-label={`Remove item ${index + 1}`}
                    onClick={() => setAgenda((all) => all.filter((i) => i.key !== item.key))}
                  >
                    {''}
                  </Button>
                </div>
              </div>
              <div className="agenda-editor__more">
                <Select
                  label="Presented by"
                  options={presenterOptions}
                  value={item.presenterId}
                  onChange={(event) => setItem(item.key, { presenterId: event.target.value })}
                />
                <Input
                  label="Notes"
                  optional
                  maxLength={2000}
                  value={item.description}
                  onChange={(event) => setItem(item.key, { description: event.target.value })}
                />
              </div>
            </li>
          ))}
        </ol>
        <div>
          <Button
            variant="secondary"
            size="sm"
            inline
            icon={<IconPlus />}
            disabled={agenda.length >= MAX_AGENDA_ITEMS}
            onClick={() =>
              setAgenda((all) => [
                ...all,
                { key: nextKey++, title: '', description: '', presenterId: '' },
              ])
            }
          >
            Add agenda item
          </Button>
        </div>
        {errors.agenda && <p className="field__error">{errors.agenda}</p>}
      </fieldset>

      {errors.form && <p className="form-error">{errors.form}</p>}
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : meeting ? 'Save changes' : 'Schedule meeting'}
        </Button>
      </div>
    </form>
  );
}
