import { useEffect, useState } from 'react';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconBell,
  IconCheckCircle,
  IconChevronLeft,
  IconChevronRight,
  IconTile,
  LoadingState,
  PageHeader,
  SegmentedControl,
} from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../api/notifications';
import { useOpenNotification } from '../api/open';

import { NotificationItem } from './NotificationItem';

type Show = 'unread' | 'all';

const SHOW_OPTIONS = [
  { value: 'unread', label: 'Unread' },
  { value: 'all', label: 'All' },
] as const;

const PAGE_SIZE = 20;

/** Every notification the signed-in user has, across their communities. */
export function NotificationsPage() {
  const [show, setShow] = useState<Show>('all');
  const [page, setPage] = useState(1);

  const list = useNotifications({ unread: show === 'unread', page, page_size: PAGE_SIZE });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const openNotification = useOpenNotification();

  const data = list.data;
  const pageCount = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const unread = data?.unread_count ?? 0;

  // Marking items read shrinks the Unread list; never sit past its last page.
  useEffect(() => {
    if (data && page > pageCount) setPage(pageCount);
  }, [data, page, pageCount]);

  const actionError = markAll.error ?? markRead.error;

  return (
    <div className="notif-page">
      <PageHeader
        title="Notifications"
        subtitle="Updates from all your communities. We also send these by email."
        actions={
          <Button
            variant="secondary"
            inline
            icon={<IconCheckCircle width={18} height={18} />}
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </Button>
        }
      />

      <div className="notif-page__toolbar">
        <SegmentedControl
          label="Show"
          options={SHOW_OPTIONS}
          value={show}
          onChange={(value) => {
            setShow(value);
            setPage(1);
          }}
        />
        <span className="notif-page__count" aria-live="polite">
          {unread === 0 ? 'No unread notifications' : `${unread} unread`}
        </span>
      </div>

      {actionError && (
        <p className="notif-page__error" role="alert">
          {errorMessage(actionError)}
        </p>
      )}

      {list.isPending ? (
        <LoadingState label="Loading notifications…" />
      ) : list.isError ? (
        <ErrorState title="Could not load notifications" message={errorMessage(list.error)} />
      ) : data && data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={
              <IconTile tone="neutral" size="lg">
                <IconBell />
              </IconTile>
            }
            title="You're all caught up"
            message={
              show === 'unread'
                ? 'There is nothing you have not read.'
                : 'Nothing here yet. News from your communities will appear here.'
            }
          />
        </Card>
      ) : (
        <Card className="notif-page__card">
          <ul className="notif-page__list">
            {data?.items.map((notification) => (
              <li key={notification.id} className="notif-page__row">
                <NotificationItem
                  variant="page"
                  notification={notification}
                  onOpen={openNotification}
                />
                {notification.read_at === null && (
                  <button
                    type="button"
                    className="notif-page__mark"
                    disabled={markRead.isPending && markRead.variables === notification.id}
                    onClick={() => markRead.mutate(notification.id)}
                  >
                    Mark as read
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pageCount > 1 && (
        <nav className="pagination notif-page__pager" aria-label="Pagination">
          <button
            type="button"
            className="pagination__step"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <IconChevronLeft width={16} height={16} />
            Previous
          </button>
          <span className="notif-page__count">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className="pagination__step"
            disabled={page >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
            <IconChevronRight width={16} height={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
