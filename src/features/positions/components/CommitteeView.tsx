import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
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
  const { communityId } = useWorkspace();
  const committee = useCommittee(communityId);
  const seats = committee.data ?? [];

  return (
    <div className="page">
      <PageHeader title="Committee" />

      {committee.isPending ? (
        <LoadingState label="Loading the committee…" />
      ) : committee.error ? (
        <section className="card">
          <ErrorState message={errorMessage(committee.error)} />
        </section>
      ) : seats.length === 0 ? (
        <section className="card">
          <EmptyState icon={<IconUsers width={28} height={28} />} title="No committee" />
        </section>
      ) : (
        <ul className="position-grid" role="list">
          {seats.map((seat) => (
            <li key={seat.id} className="position-card">
              <div className="position-card__main">
                <span className="position-card__head">
                  <IconTile tone="neutral" size="md">
                    <PositionIcon name={seat.name} />
                  </IconTile>
                  <h2 className="position-card__name">{seat.name}</h2>
                </span>
                {seat.description && (
                  <p className="position-card__description">{seat.description}</p>
                )}
              </div>
              <div className="position-card__foot">
                {seat.holders.length === 0 ? (
                  <Badge tone="warning" dot>
                    Vacant
                  </Badge>
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
