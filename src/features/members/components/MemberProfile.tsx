import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  IconAlertTriangle,
  IconArrowLeft,
  IconAtSign,
  IconCalendar,
  IconCheckCircle,
  IconChevronRight,
  IconClose,
  IconGavel,
  IconIdBadge,
  IconInfoCircle,
  IconLayers,
  IconLogout,
  IconPauseCircle,
  IconPencil,
  IconShield,
  IconShieldCheck,
  IconTile,
  IconUserMinus,
  IconUserPen,
  IconUsers,
  LoadingState,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import {
  PERMISSION_CATALOG,
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

const PERMISSION_TEXT = new Map(PERMISSION_CATALOG.map((p) => [p.code, p.description]));

export function MemberProfile({ memberId }: { memberId: string }) {
  const directory = useMemberDirectory();
  const member = directory.members.find((m) => m.membershipId === memberId);

  if (directory.isPending) return <LoadingState label="Loading member…" />;

  if (directory.error) {
    return (
      <div className="page">
        <BackLink />
        <section className="card">
          <ErrorState message={errorMessage(directory.error)} />
        </section>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="page">
        <BackLink />
        <section className="card">
          <EmptyState
            icon={<IconUsers width={28} height={28} />}
            title="Member not found"
            message="They may have left or been removed from the community."
          />
        </section>
      </div>
    );
  }

  return <Profile member={member} />;
}

function BackLink() {
  return (
    <div className="profile-top">
      <Link to="/community/members" className="back-link">
        <IconArrowLeft width={20} height={20} />
        Back to Members
      </Link>
    </div>
  );
}

function Profile({ member }: { member: DirectoryMember }) {
  const [pending, setPending] = useState<PendingAction>(null);
  const { can } = useWorkspace();
  const isActive = member.status === 'active';

  const canAssign = can('position.assign');
  const canSuspend = can('member.suspend') && !member.isYou;
  const canRemove = can('member.remove') && !member.isYou;
  const hasActions = canAssign || canSuspend || canRemove || member.isYou;

  return (
    <div className="page">
      <BackLink />

      <section className="card profile-hero">
        <div className="profile-hero__identity">
          <span className="profile-hero__avatar">
            <Avatar name={member.fullName} tone="brand" size="xl" square />
            {isActive && (
              <span className="profile-hero__verified" aria-label="Active">
                <IconCheckCircle width={16} height={16} />
              </span>
            )}
          </span>
          <div>
            <div className="profile-hero__name-row">
              <h1 className="profile-hero__name">{member.fullName}</h1>
              {isActive ? (
                <Badge tone="success" dot>
                  Active Member
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
            </div>
            {member.joinDate && (
              <p className="profile-hero__since">
                <IconCalendar width={18} height={18} aria-hidden="true" />
                Member since <strong>{formatMonthYear(member.joinDate)}</strong>
              </p>
            )}
          </div>
        </div>
        <div className="profile-hero__chips">
          {member.isAdmin && (
            <span className="chip">
              <IconShieldCheck width={18} height={18} aria-hidden="true" />
              Community Admin
            </span>
          )}
          {member.isFounder && (
            <span className="chip">
              <IconGavel width={18} height={18} aria-hidden="true" />
              Founder
            </span>
          )}
        </div>
      </section>

      <div className="profile-grid">
        <div className="profile-grid__main">
          <GovernanceCard member={member} canRevoke={canAssign} />
          <MembershipCard member={member} />
        </div>

        {hasActions && (
          <div className="profile-grid__rail">
            <section className="card" aria-labelledby="actions-title">
              <header className="section-head">
                <IconTile tone="info" size="lg">
                  <IconShield />
                </IconTile>
                <div className="section-head__text">
                  <p className="section-head__eyebrow">Executive Actions</p>
                  <h2 id="actions-title" className="section-head__title">
                    Management Portal
                  </h2>
                </div>
                {!member.isYou && <Badge tone="warning">Admin Only</Badge>}
              </header>

              <p className="card__lede">
                {member.isYou
                  ? 'Changes to your own participation in this community.'
                  : `Execute constitutionally sanctioned modifications to ${member.fullName}'s community participation level.`}
              </p>

              <div className="action-list">
                {canAssign && (
                  <button type="button" className="action-row" onClick={() => setPending('assign')}>
                    <IconUserPen aria-hidden="true" />
                    <span className="action-row__label">Assign Position</span>
                    <IconPencil aria-hidden="true" />
                  </button>
                )}
                {canSuspend &&
                  (isActive ? (
                    <button
                      type="button"
                      className="action-row action-row--warning"
                      onClick={() => setPending('suspend')}
                    >
                      <IconPauseCircle aria-hidden="true" />
                      <span className="action-row__label">Suspend Member</span>
                      <IconChevronRight aria-hidden="true" />
                    </button>
                  ) : member.status === 'suspended' ? (
                    <button
                      type="button"
                      className="action-row action-row--success"
                      onClick={() => setPending('reinstate')}
                    >
                      <IconShieldCheck aria-hidden="true" />
                      <span className="action-row__label">Reinstate Member</span>
                      <IconChevronRight aria-hidden="true" />
                    </button>
                  ) : null)}
                {canRemove && (
                  <button
                    type="button"
                    className="action-row action-row--danger"
                    onClick={() => setPending('remove')}
                  >
                    <IconUserMinus aria-hidden="true" />
                    <span className="action-row__label">Remove Member</span>
                    <IconAlertTriangle aria-hidden="true" />
                  </button>
                )}
                {member.isYou && (
                  <button
                    type="button"
                    className="action-row action-row--danger"
                    onClick={() => setPending('leave')}
                  >
                    <IconLogout aria-hidden="true" />
                    <span className="action-row__label">Leave Community</span>
                    <IconAlertTriangle aria-hidden="true" />
                  </button>
                )}
              </div>

              <aside className="notice notice--warning">
                <IconInfoCircle aria-hidden="true" />
                <div>
                  <p className="notice__title">Constitutional Notice</p>
                  <p className="notice__text">
                    Destructive actions require confirmation: Suspending or removing a member
                    terminates active voting rights and revokes constitutional registry privileges
                    immediately. A community always keeps at least one admin.
                  </p>
                </div>
              </aside>
            </section>
          </div>
        )}
      </div>

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

function GovernanceCard({ member, canRevoke }: { member: DirectoryMember; canRevoke: boolean }) {
  const { communityId } = useWorkspace();
  const revoke = useRevokePosition(communityId ?? '');
  const primary = member.positions[0];

  return (
    <section className="card" aria-labelledby="role-title">
      <header className="section-head">
        <IconTile tone="brand" size="lg">
          <IconIdBadge />
        </IconTile>
        <div className="section-head__text">
          <p className="section-head__eyebrow">Governance Role</p>
          <h2 id="role-title" className="section-head__title">
            {member.positions.length > 1 ? 'Positions Held' : 'Elected Position'}
          </h2>
        </div>
      </header>

      {!member.positionsKnown ? (
        <p className="card__lede">You need the position.view permission to see positions.</p>
      ) : member.positions.length === 0 ? (
        <aside className="notice notice--warning designation-empty">
          <IconInfoCircle aria-hidden="true" />
          <div>
            <p className="notice__title">No position yet</p>
            <p className="notice__text">
              A member without a position has no permissions, so they cannot open any community
              screen. Assign one to give them access.
            </p>
          </div>
        </aside>
      ) : (
        <dl className="designation">
          <div className="designation__row">
            <dt>Designation</dt>
            <dd className="designation__roles">
              {member.positions.map((position) => (
                <span key={position.id} className="designation__role">
                  <PositionIcon name={position.name} width={20} height={20} aria-hidden="true" />
                  {position.name}
                  {canRevoke && member.positions.length > 0 && (
                    <button
                      type="button"
                      className="designation__revoke"
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
                </span>
              ))}
            </dd>
          </div>
          {primary?.is_admin && (
            <div className="designation__row">
              <dt>Authority</dt>
              <dd>Administers positions and members</dd>
            </div>
          )}
        </dl>
      )}
      {revoke.error && <p className="form-error">{errorMessage(revoke.error)}</p>}

      {member.permissions.length > 0 && (
        <>
          <h3 className="subheading">Responsibilities &amp; Delegated Permissions</h3>
          <ul className="permission-list" role="list">
            {member.permissions.map((code) => (
              <li key={code} title={code}>
                <IconCheckCircle width={18} height={18} aria-hidden="true" />
                {PERMISSION_TEXT.get(code) ?? code}
              </li>
            ))}
          </ul>
        </>
      )}
      {member.status === 'suspended' && member.positions.length > 0 && (
        <p className="card__lede">
          Suspended: their positions stay, but grant nothing until they are reinstated.
        </p>
      )}
    </section>
  );
}

function MembershipCard({ member }: { member: DirectoryMember }) {
  const { communityId } = useWorkspace();
  const categories = useMemberCategories(communityId);
  const category = categories.data?.find((c) => c.id === member.categoryId);

  return (
    <section className="card" aria-labelledby="membership-title">
      <header className="section-head">
        <IconTile tone="info" size="lg">
          <IconIdBadge />
        </IconTile>
        <div className="section-head__text">
          <p className="section-head__eyebrow">Institutional Status</p>
          <h2 id="membership-title" className="section-head__title">
            Membership Information
          </h2>
        </div>
      </header>

      <dl className="info-list">
        <div className="info-list__row">
          <dt>
            <IconLayers aria-hidden="true" />
            Member Category
          </dt>
          <dd>
            <span className="info-list__pill">{category?.name ?? '—'}</span>
          </dd>
        </div>
        <div className="info-list__row">
          <dt>
            <IconAtSign aria-hidden="true" />
            Email
          </dt>
          <dd>{member.email ?? <span className="table__muted">Not available</span>}</dd>
        </div>
        <div className="info-list__row">
          <dt>
            <IconCalendar aria-hidden="true" />
            Joined
          </dt>
          <dd>{member.joinDate ? formatLongDate(member.joinDate) : '—'}</dd>
        </div>
        {member.suspendedAt && member.status === 'suspended' && (
          <div className="info-list__row">
            <dt>
              <IconPauseCircle aria-hidden="true" />
              Suspended
            </dt>
            <dd>{formatLongDate(member.suspendedAt)}</dd>
          </div>
        )}
        {member.invitation && (
          <div className="info-list__row">
            <dt>
              <IconCheckCircle aria-hidden="true" />
              Joined Via
            </dt>
            <dd>
              <Badge tone="success" icon={<IconCheckCircle width={16} height={16} />}>
                Accepted invitation
              </Badge>
            </dd>
          </div>
        )}
      </dl>
      {!member.nameKnown && (
        <p className="card__lede">
          The API does not share this member&apos;s name or email with the directory yet.
        </p>
      )}
    </section>
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
