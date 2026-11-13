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
  SegmentedControl,
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

  return (
    <section className="card table-card minutes-list" aria-labelledby="minutes-list-title">
      <header className="table-card__head minutes-list__head">
        <div>
          <h2 id="minutes-list-title" className="section-head__title">
            Minutes
          </h2>
          <p className="section-head__subtitle">
            {seesDrafts
              ? 'The written record of each meeting. Drafts are seen only by those who write or finalise minutes.'
              : 'The written record of each meeting, once the secretary has finalised it.'}
          </p>
        </div>
        {seesDrafts && counts.total > 0 && (
          <SegmentedControl
            label="Show minutes"
            value={filter}
            onChange={changeFilter}
            options={[
              { value: 'all', label: `All (${counts.total})` },
              { value: 'draft', label: `Drafts (${counts.draft})` },
              { value: 'final', label: `Final (${counts.final})` },
            ]}
          />
        )}
      </header>

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
                ? 'No final minutes yet'
                : 'No minutes yet'
          }
          message={
            seesDrafts
              ? 'Open a meeting and choose "Write minutes" to start its record.'
              : 'Minutes appear here once a meeting’s record has been finalised.'
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

      {lastPage > 1 && (
        <footer className="table-footer">
          <p className="table-footer__summary">
            Page <strong>{page}</strong> of <strong>{lastPage}</strong> · {total} minutes
          </p>
          <div className="review-actions">
            <Button
              variant="secondary"
              size="sm"
              inline
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Newer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              inline
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Older
            </Button>
          </div>
        </footer>
      )}
    </section>
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
              ? `Finalised ${formatDate(row.finalized_at)}${row.finalized_by ? ` by ${row.finalized_by.full_name}` : ''}`
              : `Last changed ${formatDate(row.updated_at)}`}
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
              {downloading ? 'Preparing…' : 'Download PDF'}
            </Button>
            {downloadError && (
              <span className="field__error" role="alert">
                {downloadError}
              </span>
            )}
          </span>
        ) : (
          <span className="table__muted">PDF once final</span>
        )}
      </td>
    </tr>
  );
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
