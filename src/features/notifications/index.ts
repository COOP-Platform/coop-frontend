// Public surface of the Notifications module: the signed-in user's in-app
// notifications (the backend also emails them). See the bell in
// components/layout/Topbar.tsx and the /notifications page.
export { NotificationsMenu } from './components/NotificationsMenu';
export { NotificationsPage } from './components/NotificationsPage';
export { NotificationItem } from './components/NotificationItem';

export {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from './api/notifications';
export type { AppNotification, NotificationFilters, NotificationPage } from './api/notifications';
export { safeLink, useOpenNotification } from './api/open';
export { timeAgo } from './time';
