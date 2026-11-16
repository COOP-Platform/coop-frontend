import { useRouter } from '@tanstack/react-router';

import { selectCommunity, useWorkspace } from '@/features/auth';

import type { AppNotification } from './notifications';
import { useMarkNotificationRead } from './notifications';

/**
 * Only paths inside this app are followed. A link from the server that is not
 * one ("https://…", "//host") is ignored rather than opened.
 */
export function safeLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith('/') || link.startsWith('//')) return null;
  return link;
}

/**
 * Opening a notification: mark it read, switch to its community when it is
 * about another one the user belongs to, then go to its link (if any).
 */
export function useOpenNotification() {
  const router = useRouter();
  const { communityId, memberships } = useWorkspace();
  const markRead = useMarkNotificationRead();

  return (notification: AppNotification) => {
    if (notification.read_at === null) markRead.mutate(notification.id);

    const target = notification.community?.id;
    if (target && target !== communityId && memberships.some((m) => m.community.id === target)) {
      selectCommunity(target);
    }

    const link = safeLink(notification.link);
    if (link) router.history.push(link);
  };
}
