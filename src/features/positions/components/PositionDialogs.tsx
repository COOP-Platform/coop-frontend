import type { FormEvent } from 'react';
import { useState } from 'react';

import {
  Button,
  Dialog,
  Drawer,
  IconIdBadge,
  IconRefresh,
  IconUserPlus,
  IconTile,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import type { DirectoryMember } from '@/features/members';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { isPlainMemberPosition } from '@/lib/position-tone';

import type { Position } from '../api/positions';
import {
  useAssignPosition,
  useCreatePosition,
  useDeletePosition,
  useRevokePosition,
  useUpdatePosition,
} from '../api/positions';
import { MEMBER_BASELINE, PERMISSION_CATALOG, PERMISSION_MODULES } from '../data/permissions';

export type Editing = { mode: 'create' } | { mode: 'edit'; position: Position } | null;

/** Create or edit a position; deleting is offered from the edit form too. */
export function PositionFormDialog({
  editing,
  canDelete,
  onClose,
  onDeleted,
}: {
  editing: Editing;
  canDelete: boolean;
  onClose: () => void;
  /** After a delete — the details page leaves, since its position is gone. */
  onDeleted?: () => void;
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

  // The Member position is how every member's baseline rights are found:
  // its name is fixed and it cannot be deleted (the API refuses both).
  const isMember = initial !== undefined && isPlainMemberPosition(initial.name);

  return (
    <Drawer
      open={editing !== null}
      onClose={onClose}
      label={initial ? `Edit ${initial.name}` : 'Create position'}
    >
      <form className="details position-form" onSubmit={handleSubmit} noValidate>
        <header className="details__head">
          <div>
            <p className="section-head__eyebrow">{initial ? 'Edit position' : 'New position'}</p>
            <h2 className="section-head__title">{initial ? initial.name : 'Create Position'}</h2>
            <p className="section-head__subtitle">
              {initial
                ? 'Changes apply at once to everyone holding this position.'
                : 'Add a governance role to the community.'}
            </p>
          </div>
        </header>

        <Input
          label="Position name"
          required
          disabled={isMember}
          hint={isMember ? 'The Member position keeps its name.' : undefined}
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
                  <span>{permission.description}</span>
                </label>
              ))}
            </div>
          ))}
        </fieldset>

        {error && <p className="form-error">{errorMessage(error)}</p>}

        {confirmDelete && initial ? (
          <DeleteConfirm
            position={initial}
            pending={remove.isPending}
            onKeep={() => setConfirmDelete(false)}
            onDelete={() =>
              remove.mutate(initial.id, {
                onSuccess: () => {
                  onClose();
                  onDeleted?.();
                },
              })
            }
          />
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
        {initial && canDelete && !isMember && !confirmDelete && (
          <button
            type="button"
            className="details__action details__action--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Delete this position
          </button>
        )}
      </form>
    </Drawer>
  );
}

function DeleteConfirm({
  position,
  pending,
  onKeep,
  onDelete,
}: {
  position: Position;
  pending: boolean;
  onKeep: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="details__confirm">
      <p className="dialog__text">
        Delete <strong>{position.name}</strong>?{' '}
        {position.holder_count === 0
          ? 'Nobody holds it.'
          : `The ${position.holder_count} ${position.holder_count === 1 ? 'member' : 'members'} holding it lose it.`}
      </p>
      <div className="dialog__footer dialog__footer--flush">
        <Button variant="tint" onClick={onKeep}>
          Keep it
        </Button>
        <Button variant="danger" disabled={pending} onClick={onDelete}>
          {pending ? 'Deleting…' : 'Delete Position'}
        </Button>
      </div>
    </div>
  );
}

/** Stand-alone delete confirmation, for the details page's own Delete button. */
export function DeletePositionDialog({
  position,
  open,
  onClose,
  onDeleted,
}: {
  position: Position;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { communityId } = useWorkspace();
  const remove = useDeletePosition(communityId ?? '');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Delete ${position.name}`}
      subtitle="This cannot be undone. The community always keeps at least one admin position."
      icon={
        <IconTile tone="danger" round>
          <IconIdBadge />
        </IconTile>
      }
    >
      <DeleteConfirm
        position={position}
        pending={remove.isPending}
        onKeep={onClose}
        onDelete={() => remove.mutate(position.id, { onSuccess: onDeleted })}
      />
      {remove.error && <p className="form-error">{errorMessage(remove.error)}</p>}
    </Dialog>
  );
}

/**
 * Give a position to a member — or, with `replacing`, move it from one member
 * to another. There is no reassign endpoint: it is an assign to the new
 * holder followed by a revoke from the old, in that order, so a failure in
 * between leaves the seat held twice rather than empty (and an admin seat can
 * never drop to nobody).
 */
export function AssignMemberDialog({
  position,
  members,
  replacing,
  onClose,
}: {
  position: Position | null;
  members: readonly DirectoryMember[];
  replacing?: DirectoryMember;
  onClose: () => void;
}) {
  const { communityId } = useWorkspace();
  const assign = useAssignPosition(communityId ?? '');
  const revoke = useRevokePosition(communityId ?? '');
  const [membershipId, setMembershipId] = useState('');

  const candidates = members.filter(
    (m) => m.status === 'active' && !m.positions.some((p) => p.id === position?.id),
  );
  const pending = assign.isPending || revoke.isPending;
  const error = assign.error ?? revoke.error;

  function confirm() {
    if (position === null) return;
    assign.mutate(
      { membershipId, positionId: position.id },
      {
        onSuccess: () => {
          if (replacing === undefined) {
            onClose();
            return;
          }
          revoke.mutate(
            { membershipId: replacing.membershipId, positionId: position.id },
            { onSuccess: onClose },
          );
        },
      },
    );
  }

  return (
    <Dialog
      open={position !== null}
      onClose={onClose}
      title={
        replacing
          ? `Reassign ${position?.name ?? 'Position'}`
          : `Assign ${position?.name ?? 'Position'}`
      }
      subtitle={
        replacing
          ? `Moves this position from ${replacing.fullName} to another member. Their other positions stay.`
          : 'Adds this position to a member. Their other positions stay.'
      }
      icon={
        <IconTile tone="brand" round>
          {replacing ? <IconRefresh /> : <IconUserPlus />}
        </IconTile>
      }
      footer={
        <>
          <Button variant="tint" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={membershipId === '' || position === null || pending} onClick={confirm}>
            {pending ? 'Saving…' : 'Confirm Change'}
          </Button>
        </>
      }
    >
      <Select
        label={replacing ? 'New holder' : 'Member'}
        placeholder="Select a member"
        value={membershipId}
        onChange={(event) => setMembershipId(event.target.value)}
        options={candidates.map((m) => ({ value: m.membershipId, label: m.fullName }))}
        hint={
          candidates.length === 0
            ? 'Every active member already holds this position.'
            : 'Active members who do not already hold this position.'
        }
      />
      {error && <p className="form-error">{errorMessage(error)}</p>}
    </Dialog>
  );
}
