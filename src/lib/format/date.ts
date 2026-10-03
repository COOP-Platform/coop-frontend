const DAY = 24 * 60 * 60 * 1000;

/** "May 18, 2024" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/** "14 May 2024" */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "March 2023" */
export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** "May 11" */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "just now", "2 days ago", "1 week ago", "in 5 days". */
export function formatRelative(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const days = Math.round(Math.abs(diff) / DAY);
  const future = diff > 0;

  let phrase: string;
  if (days === 0) return future ? 'later today' : 'today';
  if (days < 7) phrase = `${days} day${days === 1 ? '' : 's'}`;
  else if (days < 30) {
    const weeks = Math.floor(days / 7);
    phrase = `${weeks} week${weeks === 1 ? '' : 's'}`;
  } else {
    const months = Math.floor(days / 30);
    phrase = `${months} month${months === 1 ? '' : 's'}`;
  }
  return future ? `in ${phrase}` : `${phrase} ago`;
}
