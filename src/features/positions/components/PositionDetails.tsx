import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconCheckCircle,
  IconIdBadge,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTile,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  LoadingState,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import type { DirectoryMember } from '@/features/members';
import { useMemberDirectory } from '@/features/members';
import { errorMessage } from '@/lib/api/errors';
import { isPlainMemberPosition } from '@/lib/position-tone';
import { PositionIcon } from '@/lib/positions';

import type { Position } from '../api/positions';
import { usePositions, useRevokePosition } from '../api/positions';
import { PERMISSION_CATALOG, PERMISSION_MODULES } from '../data/permissions';
import { AssignMemberDialog, DeletePositionDialog, PositionFormDialog } from './PositionDialogs';

/**
 * One position, in the side panel over the Positions list: who holds it,
 * what it allows, and every action on it — assign, reassign, take it off
 * someone, edit, delete. Vacant positions get the same panel; their holder
 * list is simply the place to fill the seat.
 */
export function PositionDetails({
  positionId,
  onClose,
}: {
  positionId: string;
  /** Closes the panel — after a delete, the position is gone. */
  onClose: () => void;
}) {
  const { communityId, can } = useWorkspace();
  const positions = usePositions(communityId, can('position.view'));
  const directory = useMemberDirectory();

  const [assigning, setAssigning] = useState(false);
  const [replacing, setReplacing] = useState<DirectoryMember | null>(null);
  const [revoking, setRevoking] = useState<DirectoryMember | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!can('position.view')) {
    return (
      <EmptyState
        icon={<IconIdBadge width={28} height={28} />}
        title="You can't view positions here"
        message="Seeing positions needs the position.view permission."
      />
    );
  }

  if (positions.isPending) return <LoadingState label="Loading position…" />;
  if (positions.error) return <ErrorState message={errorMessage(positions.error)} />;

  const position = positions.data.find((p) => p.id === positionId);
  if (position === undefined) {
    return (
      <EmptyState
        icon={<IconIdBadge width={28} height={28} />}
        title="This position no longer exists"
        message="It may have been deleted."
      />
    );
  }

  const holders = directory.members.filter((m) => m.positions.some((p) => p.id === position.id));
  const canAssign = can('position.assign');

  return (
    <div className="position-panel">
      <header className="details__head position-panel__head">
        <div>
          <p className="section-head__eyebrow">Position</p>
          <div className="position-panel__title-row">
            <IconTile tone={position.is_admin ? 'brand' : 'neutral'}>
              <PositionIcon name={position.name} />
            </IconTile>
            <h2 className="section-head__title">{position.name}</h2>
            {position.is_admin && <Badge tone="brand">Admin</Badge>}
            {position.holder_count === 0 ? (
              <Badge tone="warning" dot>
                Vacant
              </Badge>
            ) : (
              <Badge tone="success">{position.holder_count} assigned</Badge>
            )}
          </div>
          <p className="section-head__subtitle">{position.description ?? 'No description yet.'}</p>
        </div>
      </header>

      <div className="position-panel__actions">
        {canAssign && (
          <Button size="sm" inline icon={<IconUserPlus />} onClick={() => setAssigning(true)}>
            Assign Member
          </Button>
        )}
        {can('position.update') && (
          <Button
            variant="secondary"
            size="sm"
            inline
            icon={<IconPencil />}
            onClick={() => setEditing(true)}
          >
            Edit
          </Button>
        )}
        {/* The Member position is everyone's fallback: it is never deleted. */}
        {can('position.delete') && !isPlainMemberPosition(position.name) && (
          <Button
            variant="secondary"
            size="sm"
            inline
            icon={<IconTrash />}
            onClick={() => setDeleting(true)}
          >
            Delete
          </Button>
        )}
      </div>

      <HoldersCard
        position={position}
        holders={holders}
        holdersKnown={!directory.positionsPending}
        canAssign={canAssign}
        onAssign={() => setAssigning(true)}
        onReassign={setReplacing}
        onRevoke={setRevoking}
      />
      <PermissionsCard position={position} />

      <AssignMemberDialog
        key={assigning ? 'assign' : replacing ? `re-${replacing.membershipId}` : 'none'}
        position={assigning || replacing ? position : null}
        replacing={replacing ?? undefined}
        members={directory.members}
        onClose={() => {
          setAssigning(false);
          setReplacing(null);
        }}
      />
      <RevokeDialog
        key={revoking?.membershipId ?? 'none'}
        position={position}
        member={revoking}
        onClose={() => setRevoking(null)}
      />
      <PositionFormDialog
        key={editing ? `edit-${position.id}` : 'closed'}
        editing={editing ? { mode: 'edit', position } : null}
        canDelete={can('position.delete')}
        onClose={() => setEditing(false)}
        onDeleted={onClose}
      />
      <DeletePositionDialog
        position={position}
        open={deleting}
        onClose={() => setDeleting(false)}
        onDeleted={onClose}
      />
    </div>
  );
}

function HoldersCard({
  position,
  holders,
  holdersKnown,
  canAssign,
  onAssign,
  onReassign,
  onRevoke,
}: {
  position: Position;
  holders: readonly DirectoryMember[];
  holdersKnown: boolean;
  canAssign: boolean;
  onAssign: () => void;
  onReassign: (member: DirectoryMember) => void;
  onRevoke: (member: DirectoryMember) => void;
}) {
  return (
    <section className="panel-section" aria-labelledby="holders-title">
      <div className="panel-section__head">
        <h3 id="holders-title" className="panel-section__title">
          Assigned members
        </h3>
        {canAssign && holders.length > 0 && (
          <Button variant="secondary" size="sm" inline icon={<IconPlus />} onClick={onAssign}>
            Add
          </Button>
        )}
      </div>

      {!holdersKnown ? (
        <LoadingState label="Loading members…" />
      ) : holders.length === 0 ? (
        <EmptyState
          icon={<IconUserPlus width={28} height={28} />}
          title="This seat is open"
          message={`Nobody holds ${position.name} yet.`}
          action={
            canAssign ? (
              <Button inline icon={<IconUserPlus />} onClick={onAssign}>
                Assign a member
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="holder-list" role="list">
          {holders.map((member) => (
            <li key={member.membershipId} className="holder-list__item">
              <Avatar name={member.fullName} />
              <div className="holder-list__who">
                <Link
                  to="/community/members"
                  search={{ selected: member.membershipId }}
                  className="holder-list__name"
                >
                  {member.fullName}
                  {member.isYou && <span className="table__muted"> (you)</span>}
                </Link>
                <span className="holder-list__meta">
                  {member.email ?? 'No email on record'}
                  {member.status !== 'active' && ` · ${member.status}`}
                </span>
              </div>
              {canAssign && (
                <div className="holder-list__actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    inline
                    icon={<IconRefresh />}
                    onClick={() => onReassign(member)}
                  >
                    Reassign
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    inline
                    icon={<IconUserMinus />}
                    onClick={() => onRevoke(member)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PermissionsCard({ position }: { position: Position }) {
  const granted = new Set(position.permissions);

  return (
    <section className="panel-section" aria-labelledby="permissions-title">
      <h3 id="permissions-title" className="panel-section__title">
        Permissions ({position.permissions.length})
      </h3>

      {position.permissions.length === 0 ? (
        <p className="table__muted">This position grants no permissions.</p>
      ) : (
        PERMISSION_MODULES.map((module) => {
          const inModule = PERMISSION_CATALOG.filter(
            (p) => p.module === module && granted.has(p.code),
          );
          if (inModule.length === 0) return null;
          return (
            <div key={module} className="position-permissions">
              <h4 className="subheading">{module}</h4>
              <ul className="permission-list" role="list">
                {inModule.map((permission) => (
                  <li key={permission.code} title={permission.code}>
                    <IconCheckCircle width={18} height={18} aria-hidden="true" />
                    {permission.description}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

function RevokeDialog({
  position,
  member,
  onClose,
}: {
  position: Position;
  member: DirectoryMember | null;
  onClose: () => void;
}) {
  const { communityId } = useWorkspace();
  const revoke = useRevokePosition(communityId ?? '');

  return (
    <Dialog
      open={member !== null}
      onClose={onClose}
      title={`Remove ${position.name}`}
      subtitle="They stay a member; only this position is taken off them."
      icon={
        <IconTile tone="warning" round>
          <IconUserMinus />
        </IconTile>
      }
      footer={
        <>
          <Button variant="tint" onClick={onClose}>
            Keep
          </Button>
          <Button
            variant="danger"
            disabled={revoke.isPending || member === null}
            onClick={() => {
              if (member)
                revoke.mutate(
                  { membershipId: member.membershipId, positionId: position.id },
                  { onSuccess: onClose },
                );
            }}
          >
            {revoke.isPending ? 'Removing…' : 'Remove Position'}
          </Button>
        </>
      }
    >
      <p className="dialog__text">
        Take <strong>{position.name}</strong> off <strong>{member?.fullName}</strong>?
      </p>
      {revoke.error && <p className="form-error">{errorMessage(revoke.error)}</p>}
    </Dialog>
  );
}
