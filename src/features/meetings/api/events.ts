import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { formatLongDate } from '@/lib/format/date';

/*
 * Events and RSVP (backend S3-12, meetings/event_views.py).
 *
 * An event is a gathering that is not a meeting: a celebration, a
 * fundraiser, a welfare visit. Every member (event.view) sees the events
 * they are not hidden from; a member an event is hidden from gets 404 for
 * it (a surprise, 1 Nov decision). Only the organiser and holders of
 * event.visibility.manage are told who it is hidden from (`hidden_from`);
 * once the event exists only its organiser may change that list.
 */

export type EventType = 'celebration' | 'social' | 'fundraiser' | 'welfare' | 'sports' | 'other';

/** `completed` also covers a scheduled event that is over. */
export type EventStatus = 'scheduled' | 'completed' | 'cancelled';

export type RsvpResponse = 'confirmed' | 'apology';

/** What `?status=` accepts on the list. */
export type EventListFilter = 'upcoming' | 'completed' | 'cancelled';

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'celebration', label: 'Celebration' },
  { value: 'social', label: 'Social gathering' },
  { value: 'fundraiser', label: 'Fundraiser' },
  { value: 'welfare', label: 'Welfare visit' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

export const MAX_GUESTS = 50;

export function eventTypeLabel(type: EventType): string {
  return EVENT_TYPES.find((t) => t.value === type)?.label ?? 'Event';
}

export interface EventMemberRef {
  membership_id: string;
  full_name: string;
}

export interface RsvpCounts {
  /** Members coming. */
  confirmed: number;
  /** Members who sent apologies. */
  apologies: number;
  /** Expected members who have not answered. */
  pending: number;
  /** Active members the event is not hidden from. */
  expected: number;
  /** Guests the confirmed members bring. */
  guests: number;
}

export interface MyRsvp {
  response: RsvpResponse;
  guests: number;
  responded_at: string;
}

export interface CommunityEvent {
  id: string;
  title: string;
  event_type: EventType;
  status: EventStatus;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  description: string | null;
  guests_allowed: boolean;
  visibility: 'everyone' | 'hidden_from_some';
  /** Who must not see it; null unless the caller is the organiser or holds event.visibility.manage. */
  hidden_from: EventMemberRef[] | null;
  /** The finance budget planned for it, if any. */
  budget: { id: string; title: string } | null;
  rsvp: RsvpCounts;
  my_rsvp: MyRsvp | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  /** The organiser. */
  created_by: EventMemberRef;
  created_at: string;
  updated_at: string;
}

interface EventPage {
  items: CommunityEvent[];
  total: number;
  page: number;
  page_size: number;
}

const eventsKey = (communityId: string) => ['meetings', communityId, 'events'] as const;

export function useEvents(communityId: string | undefined, status: EventListFilter) {
  return useQuery({
    queryKey: [...eventsKey(communityId ?? ''), 'list', status],
    queryFn: () =>
      apiFetch<EventPage>(
        `/communities/${communityId ?? ''}/events/?status=${status}&page_size=100`,
      ),
    enabled: communityId !== undefined,
  });
}

export function useEvent(communityId: string | undefined, eventId: string | undefined) {
  return useQuery({
    queryKey: [...eventsKey(communityId ?? ''), 'detail', eventId ?? ''],
    queryFn: () =>
      apiFetch<CommunityEvent>(`/communities/${communityId ?? ''}/events/${eventId ?? ''}/`),
    enabled: communityId !== undefined && eventId !== undefined,
    // A 404 (hidden or gone) will not change on a retry.
    retry: false,
  });
}

/** Every write refreshes the whole meetings app for that community. */
function useEventWrite<TInput extends { communityId: string }, TResult>(
  request: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (_result, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: ['meetings', communityId] });
    },
  });
}

export interface EventInput {
  communityId: string;
  title?: string;
  event_type?: EventType;
  /** ISO 8601; must be in the future. */
  starts_at?: string;
  ends_at?: string | null;
  venue?: string | null;
  description?: string | null;
  guests_allowed?: boolean;
  /**
   * Membership ids of members who must not see the event. Needs
   * event.visibility.manage; on edit only the organiser may change it, and
   * the list replaces the old one (`[]` shows it to everyone again).
   */
  hidden_from_member_ids?: string[];
}

export function useCreateEvent() {
  return useEventWrite(({ communityId, ...body }: EventInput) =>
    apiFetch<CommunityEvent>(`/communities/${communityId}/events/`, { method: 'POST', body }),
  );
}

/** Send only what changes. */
export function useUpdateEvent() {
  return useEventWrite(({ communityId, eventId, ...body }: EventInput & { eventId: string }) =>
    apiFetch<CommunityEvent>(`/communities/${communityId}/events/${eventId}/`, {
      method: 'PATCH',
      body,
    }),
  );
}

export function useCancelEvent() {
  return useEventWrite(
    ({ communityId, eventId, reason }: { communityId: string; eventId: string; reason: string }) =>
      apiFetch<CommunityEvent>(`/communities/${communityId}/events/${eventId}/cancel/`, {
        method: 'POST',
        body: { reason },
      }),
  );
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** "Saturday 19 December 2026, 11:00 – 18:00", in the browser's time zone. */
export function formatEventWhen(event: CommunityEvent): string {
  const start = new Date(event.starts_at);
  const time = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = `${start.toLocaleDateString('en-GB', { weekday: 'long' })} ${formatLongDate(event.starts_at)}`;
  if (!event.ends_at) return `${day}, ${time(start)}`;
  const end = new Date(event.ends_at);
  return start.toDateString() === end.toDateString()
    ? `${day}, ${time(start)} – ${time(end)}`
    : `${day}, ${time(start)} – ${formatLongDate(event.ends_at)}, ${time(end)}`;
}

/** The caller's answer in plain words. */
export function myRsvpLabel(event: CommunityEvent): string {
  const mine = event.my_rsvp;
  if (!mine) return 'You have not answered yet';
  if (mine.response === 'apology') return "You can't make it";
  return mine.guests > 0
    ? `You are coming with ${mine.guests} guest${mine.guests === 1 ? '' : 's'}`
    : 'You are coming';
}

/** "5 coming (+2 guests) · 1 can't make it · 3 not answered". */
export function rsvpSummary(event: CommunityEvent): string {
  const { confirmed, apologies, pending, guests } = event.rsvp;
  return [
    `${confirmed} coming${guests > 0 ? ` (+${guests} guest${guests === 1 ? '' : 's'})` : ''}`,
    `${apologies} can't make it`,
    `${pending} not answered`,
  ].join(' · ');
}

export interface RsvpResult {
  event_id: string;
  response: RsvpResponse;
  guests: number;
  responded_at: string;
  rsvp: RsvpCounts;
}

export function useRsvp() {
  return useEventWrite(
    ({
      communityId,
      eventId,
      response,
      guests = 0,
    }: {
      communityId: string;
      eventId: string;
      response: RsvpResponse;
      guests?: number;
    }) =>
      apiFetch<RsvpResult>(`/communities/${communityId}/events/${eventId}/rsvp/`, {
        method: 'POST',
        body: { response, guests: response === 'confirmed' ? guests : 0 },
      }),
  );
}
