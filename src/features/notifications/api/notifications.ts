import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/**
 * One in-app notification (`GET /notifications/`). The same events are also
 * emailed by the backend; this is the in-app copy.
 */
export interface AppNotification {
  id: string;
  /** Machine name of the event, e.g. "contribution_submitted". */
  kind: string;
  title: string;
  body: string;
  /** A frontend path to open, like "/finance/money?tab=review"; "" when none. */
  link: string | null;
  /** The community it is about, or null for account-level notices. */
  community: { id: string; name: string } | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPage {
  items: AppNotification[];
  total: number;
  page: number;
  page_size: number;
  unread_count: number;
}

export interface NotificationFilters {
  unread?: boolean;
  page?: number;
  page_size?: number;
}

/** How often the bell asks for the unread count while the tab is visible. */
const POLL_MS = 60_000;

/** The bell's number: polled every minute while the tab is visible. */
export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => apiFetch<{ unread_count: number }>('/notifications/unread-count/'),
    select: (data) => data.unread_count,
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/** A page of the user's notifications, newest first. */
export function useNotifications(filters: NotificationFilters, enabled = true) {
  const params = new URLSearchParams();
  if (filters.unread) params.set('unread', 'true');
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  const query = params.toString();

  return useQuery({
    queryKey: queryKeys.notifications.list({ ...filters }),
    queryFn: () => apiFetch<NotificationPage>(`/notifications/${query ? `?${query}` : ''}`),
    enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<AppNotification>(`/notifications/${id}/read/`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ unread_count: number }>('/notifications/read-all/', { method: 'POST' }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.notifications.unreadCount, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
