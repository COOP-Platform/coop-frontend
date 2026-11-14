/** "savings_group" -> "Savings group". */
export function typeLabel(type: string): string {
  const text = type.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "2026-11-13T09:41:00Z" -> "13 Nov 2026, 09:41" in the viewer's time zone. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
