import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiFetch } from '@/lib/api/client';

/*
 * Minutes (backend S3-04, meetings/minutes.py).
 *
 * One set of minutes per meeting, and their id *is* the meeting's id. They
 * are a `draft` until finalised, then `final` and never change again.
 *
 * - Every member (meeting.view) reads final minutes. A draft is a 404 to
 *   anyone who cannot write (meeting.minutes.write) or finalise
 *   (meeting.minutes.publish) minutes, and the list leaves drafts out for them.
 * - meeting.minutes.write starts and edits the draft. A cancelled meeting
 *   cannot get minutes (409 meeting_not_editable); a meeting that already has
 *   some answers 409 minutes_exist.
 * - meeting.minutes.publish finalises them, only once the roll-call is saved
 *   and locked (422 attendance_missing), and only if they say something
 *   (400). The meeting then becomes `completed`.
 * - The PDF is for final minutes only (409 minutes_not_final).
 */

export type MinutesStatus = 'draft' | 'final';
export type DecisionResult = 'adopted' | 'rejected' | 'deferred';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MinutesMemberRef {
  membership_id: string;
  full_name: string;
}

export interface MinutesMeeting {
  id: string;
  title: string;
  meeting_type: string;
  status: MeetingStatus;
  scheduled_at: string;
}

export interface MinutesSummary {
  /** The meeting's id. */
  id: string;
  meeting: MinutesMeeting;
  status: MinutesStatus;
  decisions_count: number;
  action_items_count: number;
  finalized_at: string | null;
  finalized_by: MinutesMemberRef | null;
  updated_at: string;
}

export interface MinutesPage {
  items: MinutesSummary[];
  total: number;
  page: number;
  page_size: number;
  /** Over everything the caller may see, whatever the filter. `draft` is 0 for members. */
  counts: { total: number; draft: number; final: number };
}

export interface Decision {
  id: string;
  position: number;
  title: string;
  detail: string | null;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  result: DecisionResult;
}

export interface ActionItem {
  id: string;
  position: number;
  title: string;
  assignee: MinutesMemberRef | null;
  due_date: string | null;
  done: boolean;
  done_at: string | null;
}

export interface MinutesDetail {
  id: string;
  meeting: MinutesMeeting & {
    ends_at: string | null;
    location: string | null;
    online_link: string | null;
  };
  status: MinutesStatus;
  agenda: { position: number; title: string }[];
  /** The roll-call is saved and locked: needed to finalise. */
  attendance_recorded: boolean;
  quorum: {
    present: number;
    expected: number;
    percent: number;
    threshold: number;
    reached: boolean;
  } | null;
  /** The discussion notes. */
  discussion: string;
  decisions: Decision[];
  action_items: ActionItem[];
  finalized_at: string | null;
  finalized_by: MinutesMemberRef | null;
  updated_at: string;
}

export interface DecisionInput {
  /** On edit: a decision of these minutes to keep. */
  id?: string;
  title: string;
  detail: string | null;
  votes_for: number;
  votes_against: number;
  votes_abstain: number;
  /** Left out: worked out from the votes (adopted when more for than against). */
  result?: DecisionResult;
}

export interface ActionItemInput {
  /** On edit: an action item of these minutes to keep. */
  id?: string;
  title: string;
  assignee_id: string | null;
  due_date: string | null;
  done: boolean;
}

export interface MinutesInput {
  discussion: string;
  /** Replaces every decision, in this order. */
  decisions: DecisionInput[];
  /** Replaces every action item, in this order. */
  action_items: ActionItemInput[];
}

/** Limits from meetings/minutes.py and its serializers. */
export const MINUTES_LIMITS = {
  discussion: 20000,
  decisions: 50,
  actionItems: 100,
  titleMin: 3,
  titleMax: 200,
  detailMax: 5000,
  votesMax: 1_000_000,
} as const;

export const MINUTES_PAGE_SIZE = 20;

const keys = {
  all: (communityId: string) => ['meetings', communityId] as const,
  list: (communityId: string, status: MinutesStatus | 'all', page: number) =>
    ['meetings', communityId, 'minutes', 'list', { status, page }] as const,
  detail: (communityId: string, meetingId: string) =>
    ['meetings', communityId, 'minutes', 'detail', meetingId] as const,
};

const base = (communityId: string) => `/communities/${communityId}/minutes/`;

/** Where the PDF of final minutes is served (fetch with `apiDownload`). */
export const minutesPdfPath = (communityId: string, meetingId: string) =>
  `${base(communityId)}${meetingId}/pdf/`;

/** A fallback file name; the server's Content-Disposition normally wins. */
export const minutesPdfName = (meeting: Pick<MinutesMeeting, 'scheduled_at'>) =>
  `minutes-${meeting.scheduled_at.slice(0, 10)}.pdf`;

/** Minutes the caller may read, most recent meeting first. */
export function useMinutesList(
  communityId: string | undefined,
  status: MinutesStatus | 'all',
  page: number,
) {
  return useQuery({
    queryKey: keys.list(communityId ?? '', status, page),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(MINUTES_PAGE_SIZE),
      });
      if (status !== 'all') params.set('status', status);
      return apiFetch<MinutesPage>(`${base(communityId ?? '')}?${params.toString()}`);
    },
    enabled: communityId !== undefined && communityId !== '',
    placeholderData: keepPreviousData,
  });
}

/**
 * One meeting's minutes, or `null` when there are none the caller may see
 * (the backend answers 404 for "no minutes" and for a draft hidden from
 * members alike).
 */
export function useMinutes(communityId: string | undefined, meetingId: string) {
  return useQuery({
    queryKey: keys.detail(communityId ?? '', meetingId),
    queryFn: async () => {
      try {
        return await apiFetch<MinutesDetail>(`${base(communityId ?? '')}${meetingId}/`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled: communityId !== undefined && communityId !== '',
  });
}

function useMinutesWrite<TInput extends { communityId: string }>(
  request: (input: TInput) => Promise<MinutesDetail>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (_result, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: keys.all(communityId) });
    },
  });
}

/** Start the draft minutes of a meeting (meeting.minutes.write). */
export function useCreateMinutes() {
  return useMinutesWrite(
    ({
      communityId,
      meetingId,
      ...body
    }: MinutesInput & { communityId: string; meetingId: string }) =>
      apiFetch<MinutesDetail>(base(communityId), {
        method: 'POST',
        body: { meeting_id: meetingId, ...body },
      }),
  );
}

/** Edit draft minutes (meeting.minutes.write). The lists replace the old ones. */
export function useUpdateMinutes() {
  return useMinutesWrite(
    ({
      communityId,
      meetingId,
      ...body
    }: MinutesInput & { communityId: string; meetingId: string }) =>
      apiFetch<MinutesDetail>(`${base(communityId)}${meetingId}/`, { method: 'PATCH', body }),
  );
}

/** Make draft minutes final (meeting.minutes.publish). Cannot be undone. */
export function useFinaliseMinutes() {
  return useMinutesWrite(({ communityId, meetingId }: { communityId: string; meetingId: string }) =>
    apiFetch<MinutesDetail>(`${base(communityId)}${meetingId}/finalize/`, { method: 'POST' }),
  );
}

/**
 * Per-row messages from a 400 on decisions or action items, which the
 * backend sends as one entry per item: `{"decisions": [{}, {"title": ["..."]}]}`.
 * A plain string or list of strings (e.g. "listed twice") goes under `list`.
 */
export function itemErrors(
  error: unknown,
  field: 'decisions' | 'action_items',
): { rows: Record<number, string>; list?: string } {
  const rows: Record<number, string> = {};
  if (!(error instanceof ApiError) || typeof error.body !== 'object' || error.body === null) {
    return { rows };
  }
  const value = (error.body as Record<string, unknown>)[field];
  const text = (entry: unknown): string | undefined => {
    if (typeof entry === 'string') return entry;
    if (Array.isArray(entry)) return entry.find((e): e is string => typeof e === 'string');
    return undefined;
  };
  if (typeof value === 'string') return { rows, list: value };
  if (!Array.isArray(value)) return { rows };
  const asText = text(value);
  if (asText) return { rows, list: asText };
  value.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return;
    const messages = Object.values(entry as Record<string, unknown>)
      .map(text)
      .filter((m): m is string => m !== undefined);
    if (messages.length > 0) rows[index] = messages.join(' ');
  });
  return { rows };
}

export const RESULT_LABEL: Record<DecisionResult, string> = {
  adopted: 'Adopted',
  rejected: 'Rejected',
  deferred: 'Deferred',
};
