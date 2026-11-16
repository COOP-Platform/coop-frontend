import type { AppNotification } from '../api/notifications';
import { exactDate, timeAgo } from '../time';

interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  /** Wider layout for the full page: the body is not clipped. */
  variant?: 'menu' | 'page';
}

/**
 * A notification as a button: opening it marks it read and follows its link.
 * Unread ones are bold with a dot; the dot is repeated as text for screen
 * readers.
 */
export function NotificationItem({
  notification,
  onOpen,
  variant = 'menu',
}: NotificationItemProps) {
  const unread = notification.read_at === null;
  const classes = ['notif-item', `notif-item--${variant}`, unread ? 'notif-item--unread' : null]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} onClick={() => onOpen(notification)}>
      <span className="notif-item__dot" aria-hidden="true" />
      <span className="notif-item__body">
        <span className="notif-item__title">
          {unread && <span className="visually-hidden">Unread: </span>}
          {notification.title}
        </span>
        {notification.body && <span className="notif-item__text">{notification.body}</span>}
        <span className="notif-item__meta">
          {notification.community && (
            <>
              <span className="notif-item__community">{notification.community.name}</span>
              {' · '}
            </>
          )}
          <time dateTime={notification.created_at} title={exactDate(notification.created_at)}>
            {timeAgo(notification.created_at)}
          </time>
        </span>
      </span>
    </button>
  );
}
