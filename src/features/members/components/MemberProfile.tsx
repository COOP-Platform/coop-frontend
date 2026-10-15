import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconCheckCircle,
  IconClose,
  IconGavel,
  IconIdBadge,
  IconLogout,
  IconPauseCircle,
  IconShieldCheck,
  IconTile,
  IconUser,
  IconUserMinus,
  IconUserPen,
  IconUsers,
  LoadingState,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import {
  PERMISSION_CATALOG,
  PERMISSION_MODULES,
  useAssignPosition,
  usePositions,
  useRevokePosition,
} from '@/features/positions';
import { errorMessage } from '@/lib/api/errors';
import { formatLongDate, formatMonthYear } from '@/lib/format/date';
import { PositionIcon } from '@/lib/positions';

import type { DirectoryMember } from '../api/directory';
import { useMemberDirectory } from '../api/directory';
import type { LifecycleAction } from '../api/lifecycle';
import { useLeaveCommunity, useMemberLifecycle } from '../api/lifecycle';
import { useMemberCategories } from '../api/member-categories';

type PendingAction = 'assign' | LifecycleAction | 'leave' | null;

/**
 * A member's details, shown in the side panel over the Members list.
 * Admins open anyone; everyone else only themselves (from "My profile").
 */
export function MemberPanel({ memberId }: { memberId: string }) {
  const directory = useMemberDirectory();
  const { membership } = useWorkspace();
  const member = directory.members.find((m) => m.membershipId === memberId);

  // Non-admins see their own profile only; the list is all they get of others.
  if (membership !== undefined && !membership.is_admin && memberId !== membership.id) {
    return (
      <EmptyState
        icon={<IconUser width={28} height={28} />}
        title="Profiles are private"
        message="You can see the member list and your own profile."
      />
    );
  }

  if (directory.isPending) return <LoadingState label="Loading member…" />;
  if (directory.error) return <ErrorState message={errorMessage(directory.error)} />;

  if (!member) {
    return (
      <EmptyState
        icon={<IconUsers width={28} height={28} />}
        title="Member not found"
        message="They may have left or been removed from the community."
      />
    );
  }

  return <Profile member={member} />;
}

function Profile({ member }: { member: DirectoryMember }) {
  const [pending, setPending] = useState<PendingAction>(null);
  const { can, communityId } = useWorkspace();
  const revoke = useRevokePosition(communityId ?? '');
  const categories = useMemberCategories(communityId);
  const category = categories.data?.find((c) => c.id === member.categoryId);

  const isActive = member.status === 'active';
  const canAssign = can('position.assign');
  const canSuspend = can('member.suspend') && !member.isYou;
  const canRemove = can('member.remove') && !member.isYou;
  const granted = new Set(member.permissions);

  return (
    <div className="member-panel">
      <header className="details__head">
        <div className="member-panel__identity">
          <Avatar name={member.fullName} tone="brand" size="lg" square />
          <div>
            <p className="section-head__eyebrow">Member</p>
            <div className="position-panel__title-row">
              <h2 className="section-head__title">
                {member.fullName}
                {member.isYou && <span className="table__muted"> (you)</span>}
              </h2>
              {isActive ? (
                <Badge tone="success" dot>
                  Active
                </Badge>
              ) : member.status === 'suspended' ? (
                <Badge tone="warning" dot>
                  Suspended
                </Badge>
              ) : (
                <Badge tone="neutral" dot>
                  Invited
                </Badge>
              )}
              {member.isAdmin && <Badge tone="brand">Admin</Badge>}
              {member.isFounder && <Badge tone="info">Founder</Badge>}
            </div>
            <p className="section-head__subtitle">
              {member.email ?? 'No email on record'}
              {member.joinDate && ` · Member since ${formatMonthYear(member.joinDate)}`}
            </p>
          </div>
        </div>
      </header>

      {(canAssign || canSuspend || canRemove || member.isYou) && (
        <div className="position-panel__actions">
          {canAssign && (
            <Button size="sm" inline icon={<IconUserPen />} onClick={() => setPending('assign')}>
              Assign Position
            </Button>
          )}
          {canSuspend && isActive && (
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconPauseCircle />}
              onClick={() => setPending('suspend')}
            >
              Suspend
            </Button>
          )}
          {canSuspend && member.status === 'suspended' && (
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconShieldCheck />}
              onClick={() => setPending('reinstate')}
            >
              Reinstate
            </Button>
          )}
          {canRemove && (
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconUserMinus />}
              onClick={() => setPending('remove')}
            >
              Remove
            </Button>
          )}
          {member.isYou && (
            <Button
              variant="secondary"
              size="sm"
              inline
              icon={<IconLogout />}
              onClick={() => setPending('leave')}
            >
              Leave Community
            </Button>
          )}
        </div>
      )}

      <section className="panel-section" aria-labelledby="member-positions-title">
        <h3 id="member-positions-title" className="panel-section__title">
          Positions
        </h3>
        {!member.positionsKnown ? (
          <p className="table__muted">You need the position.view permission to see positions.</p>
        ) : (
          <ul className="panel-chips" role="list">
            {member.positions.map((position) => (
              <li key={position.id} className="panel-chip">
                <PositionIcon name={position.name} width={16} height={16} aria-hidden="true" />
                {position.name}
                {canAssign && (
                  <button
                    type="button"
                    className="panel-chip__remove"
                    aria-label={`Remove ${position.name} from ${member.fullName}`}
                    title="Remove this position"
                    disabled={revoke.isPending}
                    onClick={() =>
                      revoke.mutate({
                        membershipId: member.membershipId,
                        positionId: position.id,
                      })
                    }
                  >
                    <IconClose width={14} height={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {revoke.error && <p className="form-error">{errorMessage(revoke.error)}</p>}
        {member.status === 'suspended' && (
          <p className="table__muted">
            Suspended: their positions stay, but grant nothing until they are reinstated.
          </p>
        )}
      </section>

      <section className="panel-section" aria-labelledby="member-membership-title">
        <h3 id="member-membership-title" className="panel-section__title">
          Membership
        </h3>
        <dl className="panel-facts">
          <div>
            <dt>Category</dt>
            <dd>{category?.name ?? '—'}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{member.joinDate ? formatLongDate(member.joinDate) : '—'}</dd>
          </div>
          {member.suspendedAt && member.status === 'suspended' && (
            <div>
              <dt>Suspended</dt>
              <dd>{formatLongDate(member.suspendedAt)}</dd>
            </div>
          )}
          <div>
            <dt>Joined via</dt>
            <dd>{member.isFounder ? 'Founded the community' : 'Invitation'}</dd>
          </div>
        </dl>
      </section>

      {member.permissions.length > 0 && (
        <section className="panel-section" aria-labelledby="member-permissions-title">
          <h3 id="member-permissions-title" className="panel-section__title">
            Permissions ({member.permissions.length})
          </h3>
          {PERMISSION_MODULES.map((module) => {
            const inModule = PERMISSION_CATALOG.filter(
              (p) => p.module === module && granted.has(p.code),
            );
            if (inModule.length === 0) return null;
            return (
              <div key={module} className="position-permissions">
                <h4 className="subheading">{module}</h4>
                <ul className="permission-list" role="list">
                  {inModule.map((permission) => (
                    <li key={permission.code}>
                      <IconCheckCircle width={18} height={18} aria-hidden="true" />
                      {permission.description}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {canAssign && (
        <AssignPositionDialog
          member={member}
          open={pending === 'assign'}
          onClose={() => setPending(null)}
        />
      )}
      <StatusDialog
        member={member}
        action={pending === 'assign' ? null : pending}
        onClose={() => setPending(null)}
      />
    </div>
  );
}

function AssignPositionDialog({
  member,
  open,
  onClose,
}: {
  member: DirectoryMember;
  open: boolean;
  onClose: () => void;
}) {
  const { communityId } = useWorkspace();
  const positions = usePositions(communityId);
  const assign = useAssignPosition(communityId ?? '');
  const held = new Set(member.positions.map((p) => p.id));
  const available = (positions.data ?? []).filter((p) => !held.has(p.id));
  const [choice, setChoice] = useState<string>('');

  function close() {
    setChoice('');
    assign.reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Assign Position"
      subtitle={`Adds a position to ${member.fullName}. Their current positions stay.`}
      icon={
        <IconTile tone="brand" round>
          <IconIdBadge />
        </IconTile>
      }
      footer={
        <>
          <Button variant="tint" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={choice === '' || assign.isPending}
            onClick={() =>
              assign.mutate(
                { membershipId: member.membershipId, positionId: choice },
                { onSuccess: close },
              )
            }
          >
            {assign.isPending ? 'Assigning…' : 'Confirm Change'}
          </Button>
        </>
      }
    >
      {positions.isPending ? (
        <p className="dialog__text dialog__text--muted">Loading positions…</p>
      ) : available.length === 0 ? (
        <p className="dialog__text dialog__text--muted">
          They already hold every position this community has.
        </p>
      ) : (
        <fieldset className="choice-list">
          <legend className="visually-hidden">Position</legend>
          {available.map((p) => (
            <label key={p.id} className="choice">
              <input
                type="radio"
                name="position"
                value={p.id}
                checked={choice === p.id}
                onChange={() => setChoice(p.id)}
              />
              <span className="choice__icon" aria-hidden="true">
                <PositionIcon name={p.name} width={18} height={18} />
              </span>
              <span className="choice__body">
                <span className="choice__title">
                  {p.name}
                  {p.is_admin && ' · Admin'}
                </span>
                <span className="choice__meta">
                  {p.description ?? `${p.permissions.length} permissions`} · {p.holder_count}{' '}
                  {p.holder_count === 1 ? 'holder' : 'holders'}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {assign.error && <p className="form-error">{errorMessage(assign.error)}</p>}
    </Dialog>
  );
}

const STATUS_COPY = {
  suspend: {
    title: 'Suspend Member',
    body: 'They keep their positions but can do nothing here until reinstated.',
    confirm: 'Suspend Member',
  },
  reinstate: {
    title: 'Reinstate Member',
    body: 'Their existing positions become effective again immediately.',
    confirm: 'Reinstate Member',
  },
  remove: {
    title: 'Remove Member',
    body: 'Ends their membership here and drops their positions. Contributions and history stay, and they can be invited back later.',
    confirm: 'Remove Member',
  },
  leave: {
    title: 'Leave Community',
    body: 'Ends your membership here. Your other communities are untouched.',
    confirm: 'Leave Community',
  },
} as const;

function StatusDialog({
  member,
  action,
  onClose,
}: {
  member: DirectoryMember;
  action: LifecycleAction | 'leave' | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { communityId } = useWorkspace();
  const lifecycle = useMemberLifecycle(communityId ?? '');
  const leave = useLeaveCommunity(communityId ?? '');
  const copy = STATUS_COPY[action ?? 'suspend'];
  const mutation = action === 'leave' ? leave : lifecycle;
  const destructive = action === 'remove' || action === 'leave';

  function close() {
    lifecycle.reset();
    leave.reset();
    onClose();
  }

  function confirm() {
    if (action === 'leave') {
      leave.mutate(undefined, {
        onSuccess: () => {
          close();
          void navigate({ to: '/community' });
        },
      });
    } else if (action) {
      lifecycle.mutate(
        { membershipId: member.membershipId, action },
        {
          onSuccess: () => {
            close();
            if (action === 'remove') void navigate({ to: '/community/members' });
          },
        },
      );
    }
  }

  return (
    <Dialog
      open={action !== null}
      onClose={close}
      title="Confirmation Protocol"
      subtitle={copy.title}
      icon={
        <IconTile tone={action === 'reinstate' ? 'brand' : 'danger'} round>
          <IconGavel />
        </IconTile>
      }
      footer={
        <>
          <Button variant="tint" onClick={close}>
            Cancel
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            disabled={mutation.isPending}
            onClick={confirm}
          >
            {mutation.isPending ? 'Working…' : copy.confirm}
          </Button>
        </>
      }
    >
      <p className="dialog__text">
        {action === 'leave' ? (
          <>Are you sure you want to leave this community?</>
        ) : (
          <>
            Are you sure you want to alter the operational status of{' '}
            <strong>{member.fullName}</strong>? This step produces an immutable log entry in the
            cooperative minutes.
          </>
        )}
      </p>
      <p className="dialog__text dialog__text--muted">{copy.body}</p>
      {mutation.error && <p className="form-error">{errorMessage(mutation.error)}</p>}
    </Dialog>
  );
}
