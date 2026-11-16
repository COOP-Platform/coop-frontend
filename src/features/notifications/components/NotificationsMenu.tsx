import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { errorMessage } from '@/lib/api/errors';

import { useMarkAllNotificationsRead, useNotifications } from '../api/notifications';
import { useOpenNotification } from '../api/open';

import { NotificationItem } from './NotificationItem';

/** How many the bell shows; the rest are on /notifications. */
const MENU_SIZE = 8;

interface NotificationsMenuProps {
  close: () => void;
  /** Anything else the bell lists below, such as invitations awaiting an answer. */
  children?: ReactNode;
}

/** The bell's panel: the latest notifications, newest first. */
export function NotificationsMenu({ close, children }: NotificationsMenuProps) {
  const latest = useNotifications({ page: 1, page_size: MENU_SIZE });
  const markAll = useMarkAllNotificationsRead();
  const openNotification = useOpenNotification();

  const items = latest.data?.items ?? [];
  const unread = latest.data?.unread_count ?? 0;

  return (
    <div className="menu menu--wide notif-menu">
      <div className="notif-menu__header">
        <p className="menu__heading">Notifications</p>
        {unread > 0 && (
          <button
            type="button"
            className="notif-menu__action"
            disabled={markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all as read
          </button>
        )}
      </div>

      {markAll.isError && (
        <p className="menu__note notif-menu__error" role="alert">
          {errorMessage(markAll.error)}
        </p>
      )}

      {latest.isPending ? (
        <p className="menu__note menu__item-meta" role="status">
          Loading…
        </p>
      ) : latest.isError ? (
        <p className="menu__note notif-menu__error" role="alert">
          {errorMessage(latest.error)}
        </p>
      ) : items.length === 0 ? (
        <p className="menu__note menu__item-meta">You&rsquo;re all caught up.</p>
      ) : (
        <ul className="notif-menu__list">
          {items.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                onOpen={(n) => {
                  close();
                  openNotification(n);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {children}

      <Link to="/notifications" className="menu__footer-link" onClick={close}>
        See all notifications
      </Link>
    </div>
  );
}
