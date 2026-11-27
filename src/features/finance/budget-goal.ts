/** "3 days left", "Due today", "1 day late"; null without a date. */
export function dueText(due: string | null | undefined): string | null {
  if (!due) return null;
  const today = new Date(new Date().toLocaleDateString('en-CA'));
  const days = Math.round((new Date(due).getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return 'Due today';
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`;
  return `${-days} day${days === -1 ? '' : 's'} late`;
}
