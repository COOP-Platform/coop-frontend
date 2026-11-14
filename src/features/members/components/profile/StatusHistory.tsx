import { IconHistory } from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/date';

import { useMemberHistory } from '../../api/profile';

/** Invited, joined, suspended, reinstated…: oldest first. */
export function StatusHistory({
  communityId,
  membershipId,
}: {
  communityId: string;
  membershipId: string;
}) {
  const history = useMemberHistory(communityId, membershipId, true);

  return (
    <section className="panel-section" aria-labelledby="member-history-title">
      <h3 id="member-history-title" className="panel-section__title">
        Membership history
      </h3>
      {history.isPending ? (
        <p className="table__muted">Loading history…</p>
      ) : history.error ? (
        <p className="form-error">{errorMessage(history.error)}</p>
      ) : history.data.length === 0 ? (
        <p className="table__muted">Nothing has changed since they joined.</p>
      ) : (
        <ol className="status-history" role="list">
          {history.data.map((event) => (
            <li key={event.id} className="status-history__item">
              <span className="status-history__dot" aria-hidden="true">
                <IconHistory width={14} height={14} />
              </span>
              <div>
                <p className="status-history__label">
                  {event.label}
                  {event.detail && <span className="table__muted"> · {event.detail}</span>}
                </p>
                <p className="status-history__meta">
                  <time dateTime={event.at}>{formatLongDate(event.at)}</time>
                  {event.actor_name && ` · by ${event.actor_name}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
