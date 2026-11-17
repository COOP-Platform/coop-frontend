import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Button,
  EmptyState,
  ErrorState,
  IconDownload,
  IconFile,
  IconTile,
  LoadingState,
  SectionCard,
  Select,
  TableFooter,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { apiDownload } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate, formatLongDate } from '@/lib/format/date';

import { MINUTES_PAGE_SIZE, minutesPdfName, minutesPdfPath, useMinutesList } from '../api/minutes';
import type { MinutesStatus, MinutesSummary } from '../api/minutes';
import { MinutesStatusBadge } from './MinutesStatusBadge';

type Filter = MinutesStatus | 'all';

/**
 * CONTRACT (owned by the Minutes work): every minutes record the member may
 * read, newest first, each linking to its meeting. Shown as the "Minutes" tab
 * of /meetings/list.
 *
 * Members see final minutes only; those who write or finalise minutes also
 * see drafts (the backend decides, and its counts say how many of each).
 */
export function MinutesList() {
  const { communityId, can } = useWorkspace();
  const seesDrafts = can('meeting.minutes.write') || can('meeting.minutes.publish');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const { data, error, isPending, isPlaceholderData } = useMinutesList(communityId, filter, page);

  function changeFilter(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  if (data === undefined) {
    return isPending ? <LoadingState /> : <ErrorState message={errorMessage(error)} />;
  }

  const { items, total, counts } = data;
  const lastPage = Math.max(1, Math.ceil(total / MINUTES_PAGE_SIZE));

  const from = total === 0 ? 0 : (page - 1) * MINUTES_PAGE_SIZE + 1;
  const to = Math.min(page * MINUTES_PAGE_SIZE, total);

  return (
    <SectionCard
      title="Minutes"
      flush
      actions={
        seesDrafts && counts.total > 0 ? (
          <Select
            label="Show minutes"
            labelHidden
            value={filter}
            onChange={(event) => changeFilter(event.target.value as Filter)}
            options={[
              { value: 'all', label: `All (${counts.total})` },
              { value: 'draft', label: `Drafts (${counts.draft})` },
              { value: 'final', label: `Final (${counts.final})` },
            ]}
          />
        ) : undefined
      }
      footer={
        items.length > 0 ? (
          <TableFooter
            from={from}
            to={to}
            total={total}
            page={page}
            pageCount={lastPage}
            onPage={setPage}
          />
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={
            <IconTile tone="neutral" size="lg">
              <IconFile />
            </IconTile>
          }
          title={
            filter === 'draft'
              ? 'No draft minutes'
              : filter === 'final'
                ? 'No final minutes'
                : 'No minutes yet'
          }
        />
      ) : (
        <div className="table-scroll" aria-busy={isPlaceholderData}>
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Meeting</th>
                <th scope="col">Status</th>
                <th scope="col">Summary</th>
                <th scope="col" className="table__action-col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <MinutesRow key={row.id} row={row} communityId={communityId ?? ''} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function MinutesRow({ row, communityId }: { row: MinutesSummary; communityId: string }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const final = row.status === 'final';

  async function download() {
    setDownloadError(null);
    setDownloading(true);
    try {
      await apiDownload(minutesPdfPath(communityId, row.id), minutesPdfName(row.meeting));
    } catch (error) {
      setDownloadError(errorMessage(error));
    } finally {
      setDownloading(false);
    }
  }

  const parts = [
    plural(row.decisions_count, 'decision'),
    plural(row.action_items_count, 'action item'),
  ];

  return (
    <tr>
      <td>
        <span className="table__stack">
          <Link
            to="/meetings/$meetingId"
            params={{ meetingId: row.meeting.id }}
            search={{ tab: 'minutes' }}
            className="minutes-list__link"
          >
            {row.meeting.title}
          </Link>
          <span className="table__muted">
            {formatLongDate(row.meeting.scheduled_at)}
            {row.meeting.status === 'cancelled' && ' · cancelled'}
          </span>
        </span>
      </td>
      <td>
        <MinutesStatusBadge status={row.status} />
      </td>
      <td>
        <span className="table__stack">
          <span>{parts.join(' · ')}</span>
          <span className="table__muted">
            {final && row.finalized_at
              ? `Final ${formatDate(row.finalized_at)}${row.finalized_by ? ` · ${row.finalized_by.full_name}` : ''}`
              : `Changed ${formatDate(row.updated_at)}`}
          </span>
        </span>
      </td>
      <td className="table__action-col">
        {final ? (
          <span className="table__stack minutes-list__download">
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconDownload />}
              disabled={downloading}
              onClick={() => void download()}
              aria-label={`Download PDF of the minutes of ${row.meeting.title}`}
            >
              {downloading ? 'Preparing…' : 'PDF'}
            </Button>
            {downloadError && (
              <span className="field__error" role="alert">
                {downloadError}
              </span>
            )}
          </span>
        ) : (
          <span className="table__muted">—</span>
        )}
      </td>
    </tr>
  );
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
