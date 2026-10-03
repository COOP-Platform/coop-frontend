import { useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconIdBadge,
  IconInfoCircle,
  IconPlus,
  IconShieldCheck,
  IconTile,
  IconUser,
  IconUserCheck,
  IconUserPlus,
  Input,
  LoadingState,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import type { DirectoryMember } from '@/features/members';
import { useMemberDirectory } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { PositionIcon } from '@/lib/positions';

import type { Position } from '../api/positions';
import {
  useAssignPosition,
  useCreatePosition,
  useDeletePosition,
  usePositions,
  useUpdatePosition,
} from '../api/positions';
import { MEMBER_BASELINE, PERMISSION_CATALOG, PERMISSION_MODULES } from '../data/permissions';

type Editing = { mode: 'create' } | { mode: 'edit'; position: Position } | null;

export function PositionsBoard() {
  const navigate = useNavigate();
  const { membership, communityId, can } = useWorkspace();
  const positions = usePositions(communityId, can('position.view'));
  const directory = useMemberDirectory();
  const [editing, setEditing] = useState<Editing>(null);
  const [assigning, setAssigning] = useState<Position | null>(null);

  if (!can('position.view')) {
    return (
      <div className="page">
        <PageHeader title="Positions" />
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

  const list = positions.data ?? [];
  const adminCount = list.filter((p) => p.is_admin).length;
  const holdersOf = (positionId: string) =>
    directory.members.filter((m) => m.positions.some((p) => p.id === positionId));

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <span className="eyebrow eyebrow--muted">
            <IconShieldCheck width={16} height={16} aria-hidden="true" />
            Governance &amp; Authority
          </span>
        }
        title="Positions"
        subtitle="Define and manage governance positions and roles within this community."
        actions={
          can('position.create') && (
            <Button inline icon={<IconPlus />} onClick={() => setEditing({ mode: 'create' })}>
              Create Position
            </Button>
          )
        }
      />

      <section className="card matrix">
        <IconTile tone="brand" size="lg">
          <IconUserCheck />
        </IconTile>
        <div className="matrix__text">
          <h2 className="matrix__title">Elected Leadership &amp; Membership Matrix</h2>
          <p className="matrix__subtitle">
            {list.length} designated positions active across {directory.members.length} registered
            community stakeholders
          </p>
        </div>
        <div className="matrix__meta">
          <span className={adminCount > 0 ? 'matrix__quorum' : 'matrix__quorum is-short'}>
            <span className="matrix__quorum-dot" aria-hidden="true" />
            {adminCount} admin {adminCount === 1 ? 'position' : 'positions'}
          </span>
          <span className="matrix__divider" aria-hidden="true" />
          <span className="matrix__cycle">{membership?.community.name}</span>
        </div>
      </section>

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
              onView={() =>
                void navigate({ to: '/community/members', search: { role: position.id } })
              }
              onEdit={() => setEditing({ mode: 'edit', position })}
              onAssign={() => setAssigning(position)}
            />
          ))}
        </ul>
      )}

      <aside className="notice notice--info">
        <IconInfoCircle aria-hidden="true" />
        <p className="notice__text">
          Positions dictate executive sign-off thresholds and formal delegation rules for{' '}
          {membership?.community.name}. A member can hold several positions and gets the permissions
          of all of them. Changes take effect immediately, and the community always keeps at least
          one admin position.
        </p>
      </aside>

      <PositionFormDialog
        // Fresh fields for every open; closing resets a cancelled draft.
        key={editing === null ? 'closed' : editing.mode === 'edit' ? editing.position.id : 'create'}
        editing={editing}
        canDelete={can('position.delete')}
        onClose={() => setEditing(null)}
      />
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
      <div className="position-card__top">
        <IconTile tone={position.is_admin ? 'brand' : 'neutral'} size="lg">
          <PositionIcon name={position.name} />
        </IconTile>
        <span className="position-card__badges">
          {position.is_admin && <Badge tone="brand">Admin</Badge>}
          {vacant ? (
            <Badge tone="warning" dot>
              Vacant
            </Badge>
          ) : (
            <Badge tone="success" icon={<IconUser width={14} height={14} />}>
              {position.holder_count} assigned
            </Badge>
          )}
        </span>
      </div>

      <h2 className="position-card__name">{position.name}</h2>
      <p className="position-card__description">
        {position.description ?? `${position.permissions.length} permissions`}
      </p>

      <dl className="position-card__holder">
        <dt>Assigned Member</dt>
        <dd>
          {vacant ? (
            <span className="position-card__vacant">Seat open</span>
          ) : first && holdersKnown ? (
            <>
              <span className="status-dot" aria-hidden="true" />
              {first.fullName}
              {position.holder_count > 1 && (
                <span className="table__muted"> +{position.holder_count - 1}</span>
              )}
            </>
          ) : (
            `${position.holder_count} ${position.holder_count === 1 ? 'member' : 'members'}`
          )}
        </dd>
      </dl>

      <div className="position-card__actions">
        {vacant && canAssign ? (
          <Button variant="secondary" size="sm" icon={<IconUserPlus />} onClick={onAssign}>
            Assign
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={onView}>
            View Details
          </Button>
        )}
        {canEdit ? (
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
        ) : (
          canAssign &&
          !vacant && (
            <Button variant="secondary" size="sm" onClick={onAssign}>
              Assign
            </Button>
          )
        )}
      </div>
    </li>
  );
}

function PositionFormDialog({
  editing,
  canDelete,
  onClose,
}: {
  editing: Editing;
  canDelete: boolean;
  onClose: () => void;
}) {
  const { communityId } = useWorkspace();
  const create = useCreatePosition(communityId ?? '');
  const update = useUpdatePosition(communityId ?? '');
  const remove = useDeletePosition(communityId ?? '');
  const initial = editing?.mode === 'edit' ? editing.position : undefined;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [permissions, setPermissions] = useState<Set<string>>(
    new Set(initial?.permissions ?? MEMBER_BASELINE),
  );
  const [nameError, setNameError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saving = create.isPending || update.isPending;
  const error = create.error ?? update.error ?? remove.error;

  function toggle(code: string) {
    setPermissions((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() === '') {
      setNameError('Give the position a name.');
      return;
    }
    const input = {
      name: name.trim(),
      description: description.trim(),
      permissions: [...permissions],
    };
    const onError = (e: Error) => {
      if (e instanceof ApiError && e.fieldErrors.name) setNameError(e.fieldErrors.name);
    };
    if (initial) update.mutate({ id: initial.id, ...input }, { onSuccess: onClose, onError });
    else create.mutate(input, { onSuccess: onClose, onError });
  }

  return (
    <Dialog
      open={editing !== null}
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : 'Create Position'}
      subtitle={
        initial
          ? 'Changes apply at once to everyone holding this position.'
          : 'Add a governance role to the community.'
      }
      icon={
        <IconTile tone="brand" round>
          <IconIdBadge />
        </IconTile>
      }
    >
      <form className="dialog__form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Position name"
          required
          maxLength={60}
          placeholder="e.g. Vice Treasurer"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(undefined);
          }}
          error={nameError}
        />
        <Textarea
          label="Description"
          optional
          rows={2}
          maxLength={255}
          placeholder="What this role is responsible for."
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <fieldset className="permission-picker">
          <legend className="field__label">
            Permissions <span className="field__optional">({permissions.size} selected)</span>
          </legend>
          {PERMISSION_MODULES.map((module) => (
            <div key={module} className="permission-picker__group">
              <p className="permission-picker__module">{module}</p>
              {PERMISSION_CATALOG.filter((p) => p.module === module).map((permission) => (
                <label key={permission.code} className="permission-picker__item">
                  <input
                    type="checkbox"
                    checked={permissions.has(permission.code)}
                    onChange={() => toggle(permission.code)}
                  />
                  <span>
                    {permission.description}
                    <span className="permission-picker__code">{permission.code}</span>
                  </span>
                </label>
              ))}
            </div>
          ))}
        </fieldset>

        {error && <p className="form-error">{errorMessage(error)}</p>}

        {confirmDelete && initial ? (
          <div className="details__confirm">
            <p className="dialog__text">
              Delete <strong>{initial.name}</strong>? The {initial.holder_count}{' '}
              {initial.holder_count === 1 ? 'member' : 'members'} holding it lose it.
            </p>
            <div className="dialog__footer dialog__footer--flush">
              <Button variant="tint" onClick={() => setConfirmDelete(false)}>
                Keep it
              </Button>
              <Button
                variant="danger"
                disabled={remove.isPending}
                onClick={() => remove.mutate(initial.id, { onSuccess: onClose })}
              >
                {remove.isPending ? 'Deleting…' : 'Delete Position'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="dialog__footer dialog__footer--flush">
            <Button variant="tint" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Position'}
            </Button>
          </div>
        )}
        {initial && canDelete && !confirmDelete && (
          <button
            type="button"
            className="details__action details__action--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete this position
          </button>
        )}
      </form>
    </Dialog>
  );
}

function AssignMemberDialog({
  position,
  members,
  onClose,
}: {
  position: Position | null;
  members: readonly DirectoryMember[];
  onClose: () => void;
}) {
  const { communityId } = useWorkspace();
  const assign = useAssignPosition(communityId ?? '');
  const [membershipId, setMembershipId] = useState('');

  const candidates = members.filter(
    (m) => m.status === 'active' && !m.positions.some((p) => p.id === position?.id),
  );

  return (
    <Dialog
      open={position !== null}
      onClose={onClose}
      title={`Assign ${position?.name ?? 'Position'}`}
      subtitle="Adds this position to a member. Their other positions stay."
      icon={
        <IconTile tone="brand" round>
          <IconUserPlus />
        </IconTile>
      }
      footer={
        <>
          <Button variant="tint" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={membershipId === '' || position === null || assign.isPending}
            onClick={() => {
              if (position)
                assign.mutate({ membershipId, positionId: position.id }, { onSuccess: onClose });
            }}
          >
            {assign.isPending ? 'Assigning…' : 'Confirm Change'}
          </Button>
        </>
      }
    >
      <Select
        label="Member"
        placeholder="Select a member"
        value={membershipId}
        onChange={(event) => setMembershipId(event.target.value)}
        options={candidates.map((m) => ({ value: m.membershipId, label: m.fullName }))}
        hint="Active members who do not already hold this position."
      />
      {assign.error && <p className="form-error">{errorMessage(assign.error)}</p>}
    </Dialog>
  );
}
