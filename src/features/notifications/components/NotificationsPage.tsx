import { useEffect, useState } from 'react';

import {
  Button,
  EmptyState,
  ErrorState,
  IconBell,
  IconCheckCircle,
  IconTile,
  LoadingState,
  PageHeader,
  SectionCard,
  Select,
  TableFooter,
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
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
];

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
  const from = (page - 1) * PAGE_SIZE + 1;

  return (
    <div className="notif-page">
      <PageHeader
        title="Notifications"
        subtitle={<span aria-live="polite">{unread === 0 ? 'No unread' : `${unread} unread`}</span>}
      />

      {actionError && (
        <p className="notif-page__error" role="alert">
          {errorMessage(actionError)}
        </p>
      )}

      <SectionCard
        title={show === 'unread' ? 'Unread' : 'All notifications'}
        flush
        actions={
          <>
            <Select
              label="Show"
              labelHidden
              options={SHOW_OPTIONS}
              value={show}
              onChange={(event) => {
                setShow(event.target.value as Show);
                setPage(1);
              }}
            />
            <Button
              variant="secondary"
              inline
              icon={<IconCheckCircle width={18} height={18} />}
              disabled={unread === 0 || markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all as read
            </Button>
          </>
        }
        footer={
          data && data.items.length > 0 ? (
            <TableFooter
              from={from}
              to={from + data.items.length - 1}
              total={data.total}
              page={page}
              pageCount={pageCount}
              onPage={setPage}
            />
          ) : undefined
        }
      >
        {list.isPending ? (
          <LoadingState label="Loading notifications…" />
        ) : list.isError ? (
          <ErrorState title="Could not load notifications" message={errorMessage(list.error)} />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            icon={
              <IconTile tone="neutral" size="lg">
                <IconBell />
              </IconTile>
            }
            title={show === 'unread' ? "You're all caught up" : 'No notifications yet'}
          />
        ) : (
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
        )}
      </SectionCard>
    </div>
  );
}
