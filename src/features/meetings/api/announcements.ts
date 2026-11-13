import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useWorkspace } from '@/features/auth';
import { apiFetch } from '@/lib/api/client';

/*
 * Announcements (backend S3-13, announcements/services.py).
 *
 * A draft until published (`published_at` null); leaves the member feed once
 * `expires_at` has passed. Members only see the feed. The committee (anyone
 * holding announcement.update, .publish or .delete) also sees every draft and
 * expired ones; someone who can only create sees their own drafts. Both drafts
 * and published announcements can be edited. Deleting is a soft delete.
 */

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export const PRIORITY_LABEL: Record<AnnouncementPriority, string> = {
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
};
export type AnnouncementStatus = 'draft' | 'published' | 'expired';
/** What `?status=` accepts on the list. `expired` and `all` are committee-only. */
export type AnnouncementFilter = 'published' | 'draft' | 'expired' | 'all';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  published_at: string | null;
  expires_at: string | null;
  /** The caller has marked it read. */
  is_read: boolean;
  created_by: { membership_id: string; full_name: string };
  created_at: string;
  updated_at: string;
}

export interface AnnouncementList {
  items: Announcement[];
  total: number;
  page: number;
  page_size: number;
}

/** The permissions that let a member see every draft and expired announcement. */
export const MANAGE_ANNOUNCEMENTS = [
  'announcement.update',
  'announcement.publish',
  'announcement.delete',
] as const;

const keys = {
  all: (communityId: string) => ['meetings', communityId] as const,
  list: (communityId: string, status: AnnouncementFilter, page: number, pageSize: number) =>
    ['meetings', communityId, 'announcements', 'list', { status, page, pageSize }] as const,
  unread: (communityId: string) =>
    ['meetings', communityId, 'announcements', 'unread-count'] as const,
};

const base = (communityId: string) => `/communities/${communityId}/announcements/`;

export function useAnnouncements(
  communityId: string | undefined,
  { status, page, pageSize }: { status: AnnouncementFilter; page: number; pageSize: number },
) {
  return useQuery({
    queryKey: keys.list(communityId ?? '', status, page, pageSize),
    queryFn: () =>
      apiFetch<AnnouncementList>(
        `${base(communityId ?? '')}?status=${status}&page=${page}&page_size=${pageSize}`,
      ),
    enabled: communityId !== undefined,
    placeholderData: keepPreviousData,
  });
}

/**
 * How many announcements in the caller's feed they have not read, for the
 * current community. Exported for the Meetings dashboard:
 * `useUnreadAnnouncementsCount().data?.unread_count`.
 */
export function useUnreadAnnouncementsCount() {
  const { communityId } = useWorkspace();
  return useQuery({
    queryKey: keys.unread(communityId ?? ''),
    queryFn: () => apiFetch<{ unread_count: number }>(`${base(communityId ?? '')}unread-count/`),
    enabled: communityId !== undefined,
  });
}

export interface AnnouncementFields {
  title: string;
  body: string;
  priority: AnnouncementPriority;
  /** ISO date-time, or null for "never". Must be in the future. */
  expires_at: string | null;
}

function useAnnouncementMutation<V extends { communityId: string }, R>(
  request: (variables: V) => Promise<R>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (_r, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: keys.all(communityId) });
    },
  });
}

/** Saved as a draft unless `publish` (which also needs announcement.publish). */
export function useCreateAnnouncement() {
  return useAnnouncementMutation(
    ({ communityId, ...body }: AnnouncementFields & { communityId: string; publish: boolean }) =>
      apiFetch<Announcement>(base(communityId), { method: 'POST', body }),
  );
}

/** Send only what changed; `expires_at: null` clears the expiry. */
export function useUpdateAnnouncement() {
  return useAnnouncementMutation(
    ({
      communityId,
      announcementId,
      changes,
    }: {
      communityId: string;
      announcementId: string;
      changes: Partial<AnnouncementFields>;
    }) =>
      apiFetch<Announcement>(`${base(communityId)}${announcementId}/`, {
        method: 'PATCH',
        body: changes,
      }),
  );
}

type Target = { communityId: string; announcementId: string };

export function usePublishAnnouncement() {
  return useAnnouncementMutation(({ communityId, announcementId }: Target) =>
    apiFetch<Announcement>(`${base(communityId)}${announcementId}/publish/`, { method: 'POST' }),
  );
}

/** Back to draft: it leaves the feed. Read receipts are kept. */
export function useUnpublishAnnouncement() {
  return useAnnouncementMutation(({ communityId, announcementId }: Target) =>
    apiFetch<Announcement>(`${base(communityId)}${announcementId}/unpublish/`, {
      method: 'POST',
    }),
  );
}

export function useDeleteAnnouncement() {
  return useAnnouncementMutation(({ communityId, announcementId }: Target) =>
    apiFetch<void>(`${base(communityId)}${announcementId}/`, { method: 'DELETE' }),
  );
}

/** Only works for an announcement in the feed (published, not expired). Idempotent. */
export function useMarkAnnouncementRead() {
  return useAnnouncementMutation(({ communityId, announcementId }: Target) =>
    apiFetch<{ is_read: boolean; unread_count: number }>(
      `${base(communityId)}${announcementId}/read/`,
      { method: 'POST' },
    ),
  );
}
