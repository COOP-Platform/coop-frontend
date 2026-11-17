import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Drawer,
  ErrorState,
  IconIdBadge,
  IconPlus,
  IconShieldCheck,
  IconTile,
  IconUserCheck,
  IconUserOff,
  LoadingState,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import type { DirectoryMember } from '@/features/members';
import { useMemberDirectory } from '@/features/members';
import { errorMessage } from '@/lib/api/errors';
import { PositionIcon } from '@/lib/positions';

import type { Position } from '../api/positions';
import { usePositions } from '../api/positions';
import { CommitteeView } from './CommitteeView';
import { PositionDetails } from './PositionDetails';
import { AssignMemberDialog, PositionFormDialog } from './PositionDialogs';
import type { Editing } from './PositionDialogs';

interface PositionsBoardProps {
  /** Position shown in the details panel. */
  selected?: string;
  onSelect: (positionId: string | undefined) => void;
}

export function PositionsBoard({ selected, onSelect }: PositionsBoardProps) {
  const { communityId, can } = useWorkspace();
  const positions = usePositions(communityId, can('position.view'));
  const directory = useMemberDirectory();
  const [editing, setEditing] = useState<Editing>(null);
  const [assigning, setAssigning] = useState<Position | null>(null);

  // Members without position.view still get to know their committee.
  if (!can('position.view')) return <CommitteeView />;

  const list = positions.data ?? [];
  const adminCount = list.filter((p) => p.is_admin).length;
  const vacantCount = list.filter((p) => p.holder_count === 0).length;
  const holdersOf = (positionId: string) =>
    directory.members.filter((m) => m.positions.some((p) => p.id === positionId));

  return (
    <div className="page">
      <PageHeader
        title="Positions"
        actions={
          can('position.create') && (
            <Button inline icon={<IconPlus />} onClick={() => setEditing({ mode: 'create' })}>
              Create Position
            </Button>
          )
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Positions"
          value={list.length}
          caption="In this community"
          icon={<IconIdBadge />}
          tone="brand"
        />
        <StatCard
          label="Filled"
          value={list.length - vacantCount}
          caption="Have a holder"
          icon={<IconUserCheck />}
          tone="info"
        />
        <StatCard
          label="Admin"
          value={adminCount}
          caption="Run the community"
          icon={<IconShieldCheck />}
          tone="accent"
        />
        <StatCard
          label="Vacant"
          value={vacantCount}
          caption="Seats open"
          icon={<IconUserOff />}
          tone="warning"
          emphasis={vacantCount > 0}
        />
      </div>

      {positions.isPending ? (
        <LoadingState label="Loading positions…" />
      ) : positions.error ? (
        <section className="card">
          <ErrorState message={errorMessage(positions.error)} />
        </section>
      ) : (
        <ul className="position-grid" role="list">
          {list.map((position) => (
            <PositionCard
              key={position.id}
              position={position}
              holders={holdersOf(position.id)}
              holdersKnown={!directory.positionsPending}
              canEdit={can('position.update')}
              canAssign={can('position.assign')}
              onView={() => onSelect(position.id)}
              onEdit={() => setEditing({ mode: 'edit', position })}
              onAssign={() => setAssigning(position)}
            />
          ))}
        </ul>
      )}

      <PositionFormDialog
        // Fresh fields for every open; closing resets a cancelled draft.
        key={editing === null ? 'closed' : editing.mode === 'edit' ? editing.position.id : 'create'}
        editing={editing}
        canDelete={can('position.delete')}
        onClose={() => setEditing(null)}
      />
      <Drawer
        open={selected !== undefined}
        onClose={() => onSelect(undefined)}
        label="Position details"
      >
        {selected && (
          <PositionDetails
            key={selected}
            positionId={selected}
            onClose={() => onSelect(undefined)}
          />
        )}
      </Drawer>
      <AssignMemberDialog
        key={assigning?.id ?? 'none'}
        position={assigning}
        members={directory.members}
        onClose={() => setAssigning(null)}
      />
    </div>
  );
}

interface PositionCardProps {
  position: Position;
  holders: readonly DirectoryMember[];
  holdersKnown: boolean;
  canEdit: boolean;
  canAssign: boolean;
  onView: () => void;
  onEdit: () => void;
  onAssign: () => void;
}

function PositionCard({
  position,
  holders,
  holdersKnown,
  canEdit,
  canAssign,
  onView,
  onEdit,
  onAssign,
}: PositionCardProps) {
  const vacant = position.holder_count === 0;
  const first = holders[0];

  return (
    <li className="position-card">
      {/* The whole top of the card opens the details. */}
      <button type="button" className="position-card__main" onClick={onView}>
        <span className="position-card__head">
          <IconTile tone={position.is_admin ? 'brand' : 'neutral'} size="md">
            <PositionIcon name={position.name} />
          </IconTile>
          <span className="position-card__name" title={position.name}>
            {position.name}
          </span>
          {position.is_admin && <Badge tone="brand">Admin</Badge>}
        </span>
        <span className="position-card__description">
          {position.description ?? `${position.permissions.length} permissions`}
        </span>
      </button>

      <div className="position-card__foot">
        {vacant ? (
          <Badge tone="warning" dot>
            Vacant
          </Badge>
        ) : first && holdersKnown ? (
          <span className="position-card__holder">
            <Avatar name={first.fullName} size="sm" />
            <span className="position-card__holder-name">{first.fullName}</span>
            {position.holder_count > 1 && (
              <span className="table__muted">+{position.holder_count - 1}</span>
            )}
          </span>
        ) : (
          <span className="position-card__holder table__muted">
            {position.holder_count} {position.holder_count === 1 ? 'member' : 'members'}
          </span>
        )}

        {vacant && canAssign ? (
          <button type="button" className="link-action" onClick={onAssign}>
            Assign
          </button>
        ) : (
          canEdit && (
            <button type="button" className="link-action" onClick={onEdit}>
              Edit
            </button>
          )
        )}
      </div>
    </li>
  );
}
