import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconCheckCircle,
  IconChevronRight,
  IconIdBadge,
  IconLayers,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconTile,
  IconTrash,
  IconUserMinus,
  IconUserPlus,
  IconUsers,
  LoadingState,
  PageHeader,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import type { DirectoryMember } from '@/features/members';
import { useMemberDirectory } from '@/features/members';
import { errorMessage } from '@/lib/api/errors';
import { PositionIcon } from '@/lib/positions';

import type { Position } from '../api/positions';
import { usePositions, useRevokePosition } from '../api/positions';
import { PERMISSION_CATALOG, PERMISSION_MODULES } from '../data/permissions';
import { AssignMemberDialog, DeletePositionDialog, PositionFormDialog } from './PositionDialogs';

/**
 * One position: who holds it, what it allows, and every action on it —
 * assign, reassign, take it off someone, edit, delete. Vacant positions get
 * the same page; their holder list is simply the place to fill the seat.
 */
export function PositionDetails({ positionId }: { positionId: string }) {
  const navigate = useNavigate();
  const { communityId, can } = useWorkspace();
  const positions = usePositions(communityId, can('position.view'));
  const directory = useMemberDirectory();

  const [assigning, setAssigning] = useState(false);
  const [replacing, setReplacing] = useState<DirectoryMember | null>(null);
  const [revoking, setRevoking] = useState<DirectoryMember | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const backToList = () => void navigate({ to: '/community/positions' });

  if (!can('position.view')) {
    return (
      <div className="page">
        <section className="card">
          <EmptyState
            icon={<IconIdBadge width={28} height={28} />}
            title="You can't view positions here"
            message="Seeing positions needs the position.view permission."
          />
        </section>
      </div>
    );
  }

  if (positions.isPending) return <LoadingState label="Loading position…" />;
  if (positions.error) {
    return (
      <div className="page">
        <section className="card">
          <ErrorState message={errorMessage(positions.error)} />
        </section>
      </div>
    );
  }

  const position = positions.data.find((p) => p.id === positionId);
  if (position === undefined) {
    return (
      <div className="page">
        <section className="card">
          <EmptyState
            icon={<IconIdBadge width={28} height={28} />}
            title="This position no longer exists"
            message="It may have been deleted."
            action={
              <Link to="/community/positions" className="btn btn--primary btn--inline">
                Back to Positions
              </Link>
            }
          />
        </section>
      </div>
    );
  }

  const holders = directory.members.filter((m) => m.positions.some((p) => p.id === position.id));
  const canAssign = can('position.assign');

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <IconIdBadge width={16} height={16} aria-hidden="true" />
        <Link to="/community/positions" className="breadcrumb__link">
          Positions
        </Link>
        <IconChevronRight width={14} height={14} aria-hidden="true" />
        <span className="breadcrumb__current" aria-current="page">
          {position.name}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="eyebrow eyebrow--muted">
            <PositionIcon name={position.name} />
            Governance position
          </span>
        }
        title={position.name}
        badge={
          <>
            {position.is_admin && <Badge tone="brand">Admin</Badge>}
            {position.holder_count === 0 ? (
              <Badge tone="warning" dot>
                Vacant
              </Badge>
            ) : (
              <Badge tone="success">{position.holder_count} assigned</Badge>
            )}
          </>
        }
        subtitle={position.description ?? 'No description yet.'}
        actions={
          <>
            {canAssign && (
              <Button inline icon={<IconUserPlus />} onClick={() => setAssigning(true)}>
                Assign Member
              </Button>
            )}
            {can('position.update') && (
              <Button
                variant="secondary"
                inline
                icon={<IconPencil />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
            {can('position.delete') && (
              <Button
                variant="secondary"
                inline
                icon={<IconTrash />}
                onClick={() => setDeleting(true)}
              >
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="profile-grid">
        <div className="profile-grid__main">
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
        </div>
        <div className="profile-grid__rail">
          <AboutCard position={position} />
        </div>
      </div>

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
        onDeleted={backToList}
      />
      <DeletePositionDialog
        position={position}
        open={deleting}
        onClose={() => setDeleting(false)}
        onDeleted={backToList}
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
    <section className="card" aria-labelledby="holders-title">
      <header className="section-head">
        <IconTile tone="brand" size="lg">
          <IconUsers />
        </IconTile>
        <div className="section-head__text">
          <p className="section-head__eyebrow">Who holds it</p>
          <h2 id="holders-title" className="section-head__title">
            Assigned Members
          </h2>
        </div>
        {canAssign && holders.length > 0 && (
          <Button variant="secondary" size="sm" inline icon={<IconPlus />} onClick={onAssign}>
            Add
          </Button>
        )}
      </header>

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
                  to="/community/members/$memberId"
                  params={{ memberId: member.membershipId }}
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
    <section className="card" aria-labelledby="permissions-title">
      <header className="section-head">
        <IconTile tone="info" size="lg">
          <IconShieldCheck />
        </IconTile>
        <div className="section-head__text">
          <p className="section-head__eyebrow">What it allows</p>
          <h2 id="permissions-title" className="section-head__title">
            Permissions ({position.permissions.length})
          </h2>
        </div>
      </header>

      {position.permissions.length === 0 ? (
        <p className="card__lede">This position grants no permissions.</p>
      ) : (
        PERMISSION_MODULES.map((module) => {
          const inModule = PERMISSION_CATALOG.filter(
            (p) => p.module === module && granted.has(p.code),
          );
          if (inModule.length === 0) return null;
          return (
            <div key={module} className="position-permissions">
              <h3 className="subheading">{module}</h3>
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

function AboutCard({ position }: { position: Position }) {
  return (
    <section className="card" aria-labelledby="about-title">
      <header className="section-head">
        <IconTile tone="neutral" size="lg">
          <IconLayers />
        </IconTile>
        <div className="section-head__text">
          <p className="section-head__eyebrow">Position</p>
          <h2 id="about-title" className="section-head__title">
            Details
          </h2>
        </div>
      </header>
      <dl className="info-list">
        <div className="info-list__row">
          <dt>Origin</dt>
          <dd>{position.is_system ? 'Suggested for this community type' : 'Created here'}</dd>
        </div>
        <div className="info-list__row">
          <dt>Admin position</dt>
          <dd>{position.is_admin ? 'Yes — can manage members and positions' : 'No'}</dd>
        </div>
        <div className="info-list__row">
          <dt>Holders</dt>
          <dd>{position.holder_count === 0 ? 'Vacant' : position.holder_count}</dd>
        </div>
        <div className="info-list__row">
          <dt>Permissions</dt>
          <dd>{position.permissions.length}</dd>
        </div>
      </dl>
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
