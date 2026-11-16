import { formatDate, formatRelative } from '@/lib/format/date';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "just now", "5 minutes ago", "2 hours ago", then the shared day-level
 * `formatRelative` ("3 days ago") — which only counts whole days, too coarse
 * for something that happened this morning.
 */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  return formatRelative(iso, now);
}

/** Full date for the hover title beside a relative time. */
export function exactDate(iso: string): string {
  return `${formatDate(iso)}, ${new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
