import { useQueries } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { MyContributions } from './api/my-contributions';

/*
 * "Paid up to June 2027": how far ahead a member who owes nothing has paid.
 * From this month forward, every month fully covered by confirmed monthly
 * payments counts; the last one is "paid up to". Payments still in review
 * carry it further, shown apart ("waiting for review"). Built from the
 * member's own contributions for this year and the next two (the same
 * requests My Contributions makes, so they are cached).
 */

const YEARS_AHEAD = 2;
type Ym = [number, number];

const next = ([y, m]: Ym): Ym => (m === 12 ? [y + 1, 1] : [y, m + 1]);
const key = ([y, m]: Ym) => `${y}-${m}`;
const monthsBetween = (a: Ym, b: Ym) => (b[0] - a[0]) * 12 + (b[1] - a[1]);

export interface PaidUpTo {
  /** The last month fully paid (confirmed), from this month on. */
  upTo: Ym;
  /** Whole months paid beyond this month (0 = this month only). */
  ahead: number;
  /** Further than `upTo` once the payments in review are confirmed. */
  pendingUpTo: Ym | null;
  /** The furthest year looked at was full: it may go further still. */
  orLater: boolean;
}

export function usePaidUpTo(
  communityId: string | undefined,
  perMonth: number | undefined,
  enabled: boolean,
): PaidUpTo | null {
  const now = new Date();
  const thisMonth: Ym = [now.getFullYear(), now.getMonth() + 1];
  const years = Array.from({ length: YEARS_AHEAD + 1 }, (_, i) => thisMonth[0] + i);

  const queries = useQueries({
    queries: years.map((year) => ({
      queryKey: queryKeys.finance.myContributions(communityId ?? '', year),
      queryFn: () =>
        apiFetch<MyContributions>(
          `/communities/${communityId ?? ''}/contributions/me/?year=${year}&page=1&page_size=100`,
        ),
      enabled: enabled && communityId !== undefined,
    })),
  });

  if (!enabled || !perMonth || perMonth <= 0) return null;
  if (queries.some((q) => q.data === undefined)) return null;

  const paid = new Map<string, { confirmed: number; pending: number }>();
  for (const q of queries) {
    for (const c of q.data?.items ?? []) {
      if (c.period_month === null) continue;
      if (c.contribution_type !== 'monthly' && c.contribution_type !== 'arrears') continue;
      const k = key([c.period_year, c.period_month]);
      const row = paid.get(k) ?? { confirmed: 0, pending: 0 };
      if (c.status === 'confirmed') row.confirmed += c.amount_minor;
      else if (c.status === 'pending') row.pending += c.amount_minor;
      paid.set(k, row);
    }
  }

  const last: Ym = [thisMonth[0] + YEARS_AHEAD, 12];
  const walk = (counts: (k: string) => number): Ym | null => {
    let found: Ym | null = null;
    for (let m: Ym = thisMonth; monthsBetween(m, last) >= 0; m = next(m)) {
      if (counts(key(m)) < perMonth) break;
      found = m;
    }
    return found;
  };

  const upTo = walk((k) => paid.get(k)?.confirmed ?? 0);
  if (upTo === null) return null;
  const withPending = walk((k) => (paid.get(k)?.confirmed ?? 0) + (paid.get(k)?.pending ?? 0));

  return {
    upTo,
    ahead: monthsBetween(thisMonth, upTo),
    pendingUpTo: withPending && monthsBetween(upTo, withPending) > 0 ? withPending : null,
    orLater: monthsBetween(upTo, last) === 0,
  };
}
