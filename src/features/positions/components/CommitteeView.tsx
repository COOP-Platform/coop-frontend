import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  IconInfoCircle,
  IconTile,
  IconUsers,
  LoadingState,
  PageHeader,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { PositionIcon } from '@/lib/positions';

import { useCommittee } from '../api/positions';

/**
 * The Positions page for a member without `position.view`: who the committee
 * is, and nothing more. Names only — no permissions, no member details, no
 * actions — from the committee endpoint any active member may read.
 */
export function CommitteeView() {
  const { membership, communityId } = useWorkspace();
  const committee = useCommittee(communityId);
  const seats = committee.data ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Committee"
        subtitle={`The people holding positions in ${membership?.community.name ?? 'your community'}.`}
      />

      {committee.isPending ? (
        <LoadingState label="Loading the committee…" />
      ) : committee.error ? (
        <section className="card">
          <ErrorState message={errorMessage(committee.error)} />
        </section>
      ) : seats.length === 0 ? (
        <section className="card">
          <EmptyState
            icon={<IconUsers width={28} height={28} />}
            title="No committee"
            message="This community has no committee positions."
          />
        </section>
      ) : (
        <ul className="position-grid" role="list">
          {seats.map((seat) => (
            <li key={seat.id} className="position-card">
              <div className="position-card__top">
                <IconTile tone="neutral" size="lg">
                  <PositionIcon name={seat.name} />
                </IconTile>
                {seat.holders.length === 0 && (
                  <span className="position-card__badges">
                    <Badge tone="warning" dot>
                      Vacant
                    </Badge>
                  </span>
                )}
              </div>
              <h2 className="position-card__name">{seat.name}</h2>
              {seat.description && <p className="position-card__description">{seat.description}</p>}
              <dl className="position-card__holder">
                <dt>{seat.holders.length > 1 ? 'Held by' : 'Assigned Member'}</dt>
                <dd>
                  {seat.holders.length === 0 ? (
                    <span className="position-card__vacant">Seat open</span>
                  ) : (
                    <ul className="committee-holders" role="list">
                      {seat.holders.map((holder) => (
                        <li key={holder.membership_id}>
                          <Avatar name={holder.full_name} size="sm" />
                          {holder.full_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </dl>
            </li>
          ))}
        </ul>
      )}

      <aside className="notice notice--info">
        <IconInfoCircle aria-hidden="true" />
        <p className="notice__text">
          Positions are assigned by your community&apos;s administrators.
        </p>
      </aside>
    </div>
  );
}
