import { IconChevronLeft, IconChevronRight } from './icons';

interface TableFooterProps {
  from: number;
  to: number;
  total: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}

/** "1–10 of 42" on the left, page buttons on the right (only when there are pages). */
export function TableFooter({ from, to, total, page, pageCount, onPage }: TableFooterProps) {
  return (
    <>
      <span className="section-card__count">
        {total === 0 ? 'None' : `${from}–${to} of ${total}`}
      </span>
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onPage={onPage} />}
    </>
  );
}

/** Previous, the page numbers (with gaps when there are many), next. */
export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="pager" aria-label="Pages">
      <button
        type="button"
        className="pager__btn"
        aria-label="Previous page"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        <IconChevronLeft width={16} height={16} />
      </button>
      {pagesToShow(page, pageCount).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} className="pager__gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            className="pager__btn"
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Page ${n}`}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ),
      )}
      <button
        type="button"
        className="pager__btn"
        aria-label="Next page"
        disabled={page === pageCount}
        onClick={() => onPage(page + 1)}
      >
        <IconChevronRight width={16} height={16} />
      </button>
    </nav>
  );
}

/** 1 … 4 5 6 … 12: the first, the last, and the pages around the current one. */
function pagesToShow(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const around = [page - 1, page, page + 1].filter((n) => n > 1 && n < count);
  const out: (number | null)[] = [1];
  if ((around[0] ?? count) > 2) out.push(null);
  out.push(...around);
  if ((around.at(-1) ?? 1) < count - 1) out.push(null);
  out.push(count);
  return out;
}
