import { useEffect, useState } from 'react';

export const PAGE_SIZE = 10;

/**
 * Client-side pages over a list. Goes back to page 1 whenever the list
 * changes length (a filter was applied), and never points past the end.
 */
export function usePaged<T>(items: readonly T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => setPage(1), [items.length]);
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    pageCount,
    setPage,
    rows: items.slice(start, start + pageSize),
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
    total: items.length,
  };
}
