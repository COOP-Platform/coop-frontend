import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiFetch } from '@/lib/api/client';

/*
 * Meetings (backend S3-02) and their roll-call (S3-03).
 *
 * Every member reads meetings and roll-calls (meeting.view). The Secretary's
 * codes change them: meeting.create, meeting.update, meeting.cancel and
 * meeting.attendance.record. A meeting's `status` only moves to `completed`
 * when its minutes are finalised, so a meeting whose date has passed can still
 * read `scheduled`: the screens decide "upcoming" / "past" from the dates.
 */

export type MeetingType = 'general' | 'committee' | 'emergency' | 'agm';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MemberRef {
  membership_id: string;
  full_name: string;
}

export interface Meeting {
  id: string;
  title: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  scheduled_at: string;
  duration_minutes: number | null;
  /** Start + duration; null when no duration was given. */
  ends_at: string | null;
  location: string | null;
  online_link: string | null;
  agenda_count: number;
}

export interface MeetingSummary extends Meeting {
  /** The community's active members. */
  expected_attendees: number;
}

export interface AgendaItem {
  id: string;
  /** Order on the agenda, starting at 1. */
  position: number;
  title: string;
  description: string | null;
  presenter: MemberRef | null;
}

export interface Quorum {
  present: number;
  expected: number;
  /** For display only, 1 decimal. */
  percent: number;
  /** Percent needed, copied from the community's rule when scheduled. */
  threshold: number;
  reached: boolean;
}

export interface MeetingDetail extends Meeting {
  description: string | null;
  quorum_threshold_percent: number;
  agenda: AgendaItem[];
  quorum: Quorum;
  /** The roll-call has been saved and locked. */
  attendance_recorded: boolean;
  minutes_published: boolean;
  cancel_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: MemberRef | null;
  created_by: MemberRef;
  created_at: string;
  updated_at: string;
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  general: 'General meeting',
  committee: 'Committee meeting',
  emergency: 'Emergency meeting',
  agm: 'Annual general meeting',
};

export const meetingKeys = {
  all: (communityId: string) => ['meetings', communityId] as const,
  list: (communityId: string) => ['meetings', communityId, 'meetings', 'list'] as const,
  detail: (communityId: string, id: string) =>
    ['meetings', communityId, 'meetings', 'detail', id] as const,
  rollCall: (communityId: string, id: string) =>
    ['meetings', communityId, 'meetings', 'roll-call', id] as const,
};

/** The list endpoint caps page_size at 100, so walk the pages. */
async function fetchAllMeetings(communityId: string): Promise<MeetingSummary[]> {
  const items: MeetingSummary[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const result = await apiFetch<{ items: MeetingSummary[]; total: number }>(
      `/communities/${communityId}/meetings/?page=${page}&page_size=100`,
    );
    items.push(...result.items);
    if (result.items.length === 0 || items.length >= result.total) break;
  }
  return items;
}

/** Every meeting of the community, most recent first. */
export function useMeetings(communityId: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.list(communityId ?? ''),
    queryFn: () => fetchAllMeetings(communityId ?? ''),
    enabled: communityId !== undefined,
  });
}

export function useMeeting(communityId: string | undefined, meetingId: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.detail(communityId ?? '', meetingId ?? ''),
    queryFn: () =>
      apiFetch<MeetingDetail>(`/communities/${communityId ?? ''}/meetings/${meetingId ?? ''}/`),
    enabled: communityId !== undefined && meetingId !== undefined,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

/** Any meetings write: invalidates everything under ['meetings', communityId]. */
function useMeetingsWrite<TInput extends { communityId: string }, TResult>(
  request: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (_result, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all(communityId) });
    },
  });
}

export interface AgendaItemInput {
  /** On edit: an existing item of this meeting to keep. Omit for a new item. */
  id?: string;
  /** Required, 1–200 characters. */
  title: string;
  description?: string | null;
  /** Membership id of an active member. */
  presenter_id?: string | null;
}

export interface MeetingInput {
  title?: string;
  description?: string | null;
  meeting_type?: MeetingType;
  /** ISO 8601; must be in the future when set or changed. */
  scheduled_at?: string;
  duration_minutes?: number | null;
  location?: string | null;
  online_link?: string | null;
  /** In order. On edit, the list replaces the whole agenda. */
  agenda?: AgendaItemInput[];
}

export function useScheduleMeeting() {
  return useMeetingsWrite(({ communityId, ...body }: MeetingInput & { communityId: string }) =>
    apiFetch<MeetingDetail>(`/communities/${communityId}/meetings/`, { method: 'POST', body }),
  );
}

/** Send only what changes. A completed or cancelled meeting is refused (409). */
export function useUpdateMeeting() {
  return useMeetingsWrite(
    ({
      communityId,
      meetingId,
      ...body
    }: MeetingInput & { communityId: string; meetingId: string }) =>
      apiFetch<MeetingDetail>(`/communities/${communityId}/meetings/${meetingId}/`, {
        method: 'PATCH',
        body,
      }),
  );
}

export function useCancelMeeting() {
  return useMeetingsWrite(
    ({
      communityId,
      meetingId,
      reason,
    }: {
      communityId: string;
      meetingId: string;
      reason: string;
    }) =>
      apiFetch<MeetingDetail>(`/communities/${communityId}/meetings/${meetingId}/cancel/`, {
        method: 'POST',
        body: { reason },
      }),
  );
}

// ---------------------------------------------------------------------------
// Roll-call (attendance)
// ---------------------------------------------------------------------------

/** `apology` is what the Brief calls EXCUSED. */
export type AttendanceStatus = 'present' | 'absent' | 'apology';
export type AttendanceChannel = 'in_person' | 'virtual' | 'proxy';

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  apology: 'Excused (apology)',
};

export const ATTENDANCE_CHANNEL_LABELS: Record<AttendanceChannel, string> = {
  in_person: 'In person',
  virtual: 'Online',
  proxy: 'By proxy',
};

export interface RollCallRecord {
  member: MemberRef & { positions: string[] };
  /** null: nothing recorded for the member yet. */
  status: AttendanceStatus | null;
  /** Only for a present member. */
  channel: AttendanceChannel | null;
  note: string | null;
  recorded_at: string | null;
}

export interface RollCall {
  meeting_id: string;
  /** Saved and locked (final): only its recorder can still correct it. */
  locked: boolean;
  locked_at: string | null;
  locked_by: MemberRef | null;
  /** Who first saved it, the only member who may change it. */
  recorded_by: MemberRef | null;
  /** Whether the caller may save it now. */
  can_edit: boolean;
  /** Open: every active member. Locked: the members on it when locked. */
  records: RollCallRecord[];
  summary: {
    expected: number;
    present: number;
    absent: number;
    apology: number;
    unrecorded: number;
  };
  quorum: Quorum;
}

export function useRollCall(communityId: string | undefined, meetingId: string | undefined) {
  return useQuery({
    queryKey: meetingKeys.rollCall(communityId ?? '', meetingId ?? ''),
    queryFn: () =>
      apiFetch<RollCall>(
        `/communities/${communityId ?? ''}/meetings/${meetingId ?? ''}/attendance/`,
      ),
    enabled: communityId !== undefined && meetingId !== undefined,
  });
}

export interface RollCallRecordInput {
  member_id: string;
  status: AttendanceStatus;
  channel?: AttendanceChannel | null;
  note?: string | null;
}

/**
 * Replaces the whole roll-call. Members left out have nothing recorded, or are
 * recorded absent when `lock` is true or it is already locked. Locking is only
 * possible once the meeting has started (409 `meeting_not_started`).
 */
export function useSaveRollCall() {
  return useMeetingsWrite(
    ({
      communityId,
      meetingId,
      records,
      lock,
    }: {
      communityId: string;
      meetingId: string;
      records: RollCallRecordInput[];
      lock: boolean;
    }) =>
      apiFetch<RollCall & { saved_at: string }>(
        `/communities/${communityId}/meetings/${meetingId}/attendance/`,
        { method: 'PUT', body: { records, lock } },
      ),
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Per-row errors of a nested list field (`{"agenda": [{}, {"title": ["…"]}]}`),
 * which ApiError.fieldErrors drops. Returns the message per index, and a
 * list-wide message when the backend sent one.
 */
export function listFieldErrors(
  error: unknown,
  field: string,
): { rows: Record<number, string>; whole?: string } {
  const rows: Record<number, string> = {};
  if (!(error instanceof ApiError)) return { rows };
  const value = (error.body as Record<string, unknown> | null)?.[field];
  if (typeof value === 'string') return { rows, whole: value };
  if (!Array.isArray(value)) return { rows };
  let whole: string | undefined;
  value.forEach((entry, index) => {
    if (typeof entry === 'string') {
      whole ??= entry;
      return;
    }
    if (entry && typeof entry === 'object') {
      for (const [key, messages] of Object.entries(entry as Record<string, unknown>)) {
        const text = Array.isArray(messages)
          ? messages.find((m) => typeof m === 'string')
          : messages;
        if (typeof text === 'string') {
          rows[index] = `${key === 'non_field_errors' ? '' : `${key}: `}${text}`;
          break;
        }
      }
    }
  });
  return { rows, whole };
}

/** When a meeting is over: its end, or the end of its day without a duration. */
export function meetingEnd(meeting: Meeting): Date {
  if (meeting.ends_at) return new Date(meeting.ends_at);
  const end = new Date(meeting.scheduled_at);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function hasStarted(meeting: Meeting, now: number = Date.now()): boolean {
  return new Date(meeting.scheduled_at).getTime() <= now;
}

/** Still ahead or happening now (cancelled ones included, so members see it). */
export function isUpcoming(meeting: Meeting, now: number = Date.now()): boolean {
  return meeting.status !== 'completed' && meetingEnd(meeting).getTime() >= now;
}

/** Can still be edited or cancelled. */
export function isOpen(meeting: Meeting): boolean {
  return meeting.status === 'scheduled' || meeting.status === 'in_progress';
}

export type MeetingPhase = 'cancelled' | 'completed' | 'now' | 'scheduled' | 'held';

/** What to tell members about where a meeting stands. */
export function meetingPhase(meeting: Meeting, now: number = Date.now()): MeetingPhase {
  if (meeting.status === 'cancelled') return 'cancelled';
  if (meeting.status === 'completed') return 'completed';
  if (!hasStarted(meeting, now)) return 'scheduled';
  return meetingEnd(meeting).getTime() >= now ? 'now' : 'held';
}

/** "Sat 7 Nov 2026" */
export function formatMeetingDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "13:00" */
export function formatMeetingTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** "13:00 – 15:30", or just the start without a duration. */
export function formatMeetingTimes(meeting: Meeting): string {
  const start = formatMeetingTime(meeting.scheduled_at);
  return meeting.ends_at ? `${start} – ${formatMeetingTime(meeting.ends_at)}` : start;
}

/** "Sat 7 Nov 2026, 13:00" */
export function formatMeetingDateTime(iso: string): string {
  return `${formatMeetingDay(iso)}, ${formatMeetingTime(iso)}`;
}
