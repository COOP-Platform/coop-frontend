import { useNavigate } from '@tanstack/react-router';
import { useId, useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconAlertTriangle,
  IconBan,
  IconCheckCircle,
  IconDownload,
  IconEye,
  IconHistory,
  IconMail,
  IconRefresh,
  IconSearch,
  IconSend,
  IconShield,
  IconUser,
  IconUserPlus,
  LoadingState,
  PageHeader,
  SegmentedControl,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { errorMessage } from '@/lib/api/errors';
import { downloadCsv } from '@/lib/csv';
import { formatDate, formatRelative, formatShortDate } from '@/lib/format/date';

import { useMemberDirectory } from '../api/directory';
import type { Invitation, InvitationStatus } from '../api/invitations';
import {
  effectiveStatus,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
  useSendInvitation,
} from '../api/invitations';
import { INVITATION_VALID_DAYS } from '../constants';
import type { InvitationsSearch, InvitationStatusFilter } from '../search';

const STATUS: Record<InvitationStatus, { label: string; detail: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', detail: 'Pending Acceptance', tone: 'warning' },
  accepted: { label: 'Accepted', detail: 'Accepted', tone: 'success' },
  expired: { label: 'Expired', detail: 'Expired', tone: 'info' },
  revoked: { label: 'Cancelled', detail: 'Cancelled', tone: 'neutral' },
  rejected: { label: 'Declined', detail: 'Declined by invitee', tone: 'neutral' },
};

/** Invitations that can no longer be used; the remedy is a fresh one. */
const CLOSED: readonly InvitationStatus[] = ['expired', 'revoked', 'rejected'];

interface InvitationsBoardProps {
  search: InvitationsSearch;
  onSearchChange: (next: InvitationsSearch) => void;
}

export function InvitationsBoard({ search, onSearchChange }: InvitationsBoardProps) {
  const navigate = useNavigate();
  const filterId = useId();
  const { membership, communityId, can } = useWorkspace();
  const canInvite = can('member.invite');
  const invitations = useInvitations(communityId, canInvite);

  const all = invitations.data ?? [];
  const status: InvitationStatusFilter = search.status ?? 'all';
  const query = (search.q ?? '').trim().toLowerCase();
  const count = (s: InvitationStatus) => all.filter((i) => effectiveStatus(i) === s).length;

  const filtered = all.filter(
    (i) =>
      (status === 'all' || effectiveStatus(i) === status) &&
      (query === '' ||
        i.full_name.toLowerCase().includes(query) ||
        i.email.toLowerCase().includes(query)),
  );

  // Details open only for an explicit selection (a row click, or a just-sent invite).
  const selected = all.find((i) => i.id === search.selected);
  const closeDetails = () => onSearchChange({ ...search, selected: undefined });

  function exportCsv() {
    downloadCsv(
      `${membership?.community.slug ?? 'community'}-invitations.csv`,
      ['Name', 'Email', 'Status', 'Sent', 'Expires'],
      filtered.map((i) => [
        i.full_name,
        i.email,
        STATUS[effectiveStatus(i)].label,
        formatDate(i.created_at),
        formatDate(i.expires_at),
      ]),
    );
  }

  if (!canInvite) {
    return (
      <div className="page">
        <PageHeader title="Invitations" />
        <section className="card">
          <EmptyState
            icon={<IconMail width={28} height={28} />}
            title="You can't manage invitations here"
            message="Seeing and sending invitations needs the member.invite permission. Ask an admin for a position that has it."
          />
        </section>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="Invitations"
        badge={<Badge tone="info">{all.length} Sent</Badge>}
        subtitle="Track and manage invitations sent to prospective cooperative members."
        actions={
          <>
            <Button variant="tint" inline icon={<IconDownload />} onClick={exportCsv}>
              Export
            </Button>
            <Button
              inline
              icon={<IconUserPlus />}
              onClick={() => void navigate({ to: '/community/invitations/new' })}
            >
              Invite Member
            </Button>
          </>
        }
      />

      <div className="toolbar card">
        <SegmentedControl
          label="Filter by status"
          appearance="solid"
          value={status}
          onChange={(value) =>
            onSearchChange({
              ...search,
              status: value === 'all' ? undefined : value,
              selected: undefined,
            })
          }
          options={[
            { value: 'all', label: `All (${all.length})` },
            { value: 'pending', label: `Pending (${count('pending')})` },
            { value: 'accepted', label: `Accepted (${count('accepted')})` },
            { value: 'expired', label: `Expired (${count('expired')})` },
          ]}
        />
        <div className="search-field search-field--compact">
          <label htmlFor={filterId} className="visually-hidden">
            Filter by name or email
          </label>
          <span className="search-field__icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            id={filterId}
            type="search"
            className="search-field__input"
            placeholder="Filter by name or email..."
            value={search.q ?? ''}
            onChange={(event) =>
              onSearchChange({ ...search, q: event.target.value || undefined, selected: undefined })
            }
          />
        </div>
      </div>

      <section className="card table-card" aria-label="Invitations">
        {invitations.isPending ? (
          <LoadingState label="Loading invitations…" />
        ) : invitations.error ? (
          <ErrorState message={errorMessage(invitations.error)} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<IconMail width={28} height={28} />}
            title={all.length === 0 ? 'No invitations yet' : 'No invitations here'}
            message={
              all.length === 0
                ? 'Invite your first member to get the community started.'
                : 'Nothing matches this status or filter.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Invitee</th>
                  <th scope="col">Status</th>
                  <th scope="col">Sent / Timeline</th>
                  <th scope="col" className="table__action-col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((invitation) => (
                  <InvitationRow
                    key={invitation.id}
                    invitation={invitation}
                    selected={invitation.id === selected?.id}
                    onSelect={() => onSearchChange({ ...search, selected: invitation.id })}
                    onReissued={(id) => onSearchChange({ ...search, selected: id })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="notice notice--info">
        <IconShield aria-hidden="true" />
        <div>
          <p className="notice__title">Tontine &amp; Cooperative Bylaws Governance</p>
          <p className="notice__text">
            Pending invitations automatically expire after {INVITATION_VALID_DAYS} calendar days to
            ensure creditworthiness calculations and rotating payout slots stay aligned with active
            verified contributors. Resending issues a fresh link and cancels the old one.
          </p>
        </div>
      </aside>

      <Drawer
        open={selected !== undefined}
        onClose={closeDetails}
        label={selected ? `Invitation details for ${selected.full_name}` : 'Invitation details'}
      >
        {selected && (
          <InvitationDetails
            invitation={selected}
            onReissued={(id) => onSearchChange({ ...search, selected: id })}
          />
        )}
      </Drawer>
    </div>
  );
}

/** Send a brand-new invitation to the same person, in the same category. */
function useReissue(invitation: Invitation, onReissued: (id: string) => void) {
  const { communityId } = useWorkspace();
  const send = useSendInvitation();

  return {
    mutation: send,
    reissue: () => {
      if (!communityId || !invitation.member_category) return;
      send.mutate(
        {
          communityId,
          full_name: invitation.full_name,
          email: invitation.email,
          category_id: invitation.member_category,
        },
        { onSuccess: (created) => onReissued(created.id) },
      );
    },
  };
}

function InvitationRow({
  invitation,
  selected,
  onSelect,
  onReissued,
}: {
  invitation: Invitation;
  selected: boolean;
  onSelect: () => void;
  onReissued: (id: string) => void;
}) {
  const resend = useResendInvitation();
  const { reissue, mutation: send } = useReissue(invitation, onReissued);
  const current = effectiveStatus(invitation);
  const status = STATUS[current];
  const error = resend.error ?? send.error;

  return (
    <tr
      className={selected ? 'table__row--clickable is-selected' : 'table__row--clickable'}
      // The whole row opens the details; the icon buttons keep their own action.
      // Keyboard users get the same through the eye button.
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button')) onSelect();
      }}
    >
      <td>
        <span className="table__person">
          <Avatar name={invitation.full_name} tone={selected ? 'brand' : undefined} />
          <span className="table__stack">
            <span className="table__name">{invitation.full_name}</span>
            <span className="table__muted">{invitation.email}</span>
          </span>
        </span>
      </td>
      <td>
        <span className="table__stack">
          <Badge
            tone={status.tone}
            dot={current === 'pending'}
            icon={
              current === 'accepted' ? (
                <IconCheckCircle width={14} height={14} />
              ) : current === 'expired' ? (
                <IconHistory width={14} height={14} />
              ) : undefined
            }
          >
            {status.label}
          </Badge>
          {current === 'pending' && invitation.invitation_email_sent_at === null && (
            <span className="table__warn">Email not sent</span>
          )}
        </span>
      </td>
      <td>
        <span className="table__stack">
          <span>{formatDate(invitation.created_at)}</span>
          {current === 'accepted' && invitation.accepted_at ? (
            <span className="table__success">Joined {formatShortDate(invitation.accepted_at)}</span>
          ) : current === 'pending' ? (
            <span className="table__muted">{formatRelative(invitation.created_at)}</span>
          ) : (
            <span className="table__muted">{status.label}</span>
          )}
        </span>
      </td>
      <td className="table__action-col">
        <span className="icon-actions">
          <button
            type="button"
            className="icon-action"
            aria-label={`View invitation for ${invitation.full_name}`}
            aria-haspopup="dialog"
            onClick={onSelect}
          >
            <IconEye />
          </button>
          {current === 'pending' && (
            <button
              type="button"
              className="icon-action"
              aria-label={`Resend invitation to ${invitation.full_name}`}
              title={resend.isSuccess ? 'Sent' : 'Resend'}
              disabled={resend.isPending}
              onClick={() => resend.mutate(invitation.id)}
            >
              {resend.isSuccess ? <IconCheckCircle /> : <IconSend />}
            </button>
          )}
          {CLOSED.includes(current) && invitation.member_category && (
            <button
              type="button"
              className="icon-action"
              aria-label={`Send a new invitation to ${invitation.full_name}`}
              title="Send a new invitation"
              disabled={send.isPending}
              onClick={reissue}
            >
              <IconRefresh />
            </button>
          )}
        </span>
        {error && (
          <span className="table__warn table__warn--block" role="alert">
            {errorMessage(error)}
          </span>
        )}
      </td>
    </tr>
  );
}

function InvitationDetails({
  invitation,
  onReissued,
}: {
  invitation: Invitation;
  onReissued: (id: string) => void;
}) {
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();
  const { reissue, mutation: send } = useReissue(invitation, onReissued);
  const { members } = useMemberDirectory();
  const [confirmCancel, setConfirmCancel] = useState(false);

  const current = effectiveStatus(invitation);
  const status = STATUS[current];
  const inviter = members.find((m) => m.membershipId === invitation.invited_by);
  const error = resend.error ?? revoke.error ?? send.error;

  return (
    <section className="details" aria-labelledby="invitation-details-title">
      <header className="details__head">
        <div>
          <p className="section-head__eyebrow">Selection</p>
          <h2 id="invitation-details-title" className="section-head__title">
            Invitation Details
          </h2>
          <p className="section-head__subtitle">Details for {invitation.full_name}</p>
        </div>
        <Badge tone={status.tone} dot={current === 'pending'}>
          {status.label}
        </Badge>
      </header>

      <div className="details__person">
        <Avatar name={invitation.full_name} tone="brand" size="lg" square />
        <div className="table__stack">
          <span className="details__name">{invitation.full_name}</span>
          <span className="table__muted">{invitation.email}</span>
        </div>
      </div>

      <dl className="details__list">
        <div>
          <dt>Status</dt>
          <dd className={`details__status details__status--${status.tone}`}>{status.detail}</dd>
        </div>
        <div>
          <dt>Date Sent</dt>
          <dd>
            {formatDate(invitation.created_at)} ({formatRelative(invitation.created_at)})
          </dd>
        </div>
        {current === 'accepted' && invitation.accepted_at ? (
          <div>
            <dt>Joined</dt>
            <dd>{formatDate(invitation.accepted_at)}</dd>
          </div>
        ) : current === 'revoked' && invitation.revoked_at ? (
          <div>
            <dt>Cancelled</dt>
            <dd>{formatDate(invitation.revoked_at)}</dd>
          </div>
        ) : current === 'rejected' && invitation.rejected_at ? (
          <div>
            <dt>Declined</dt>
            <dd>{formatDate(invitation.rejected_at)}</dd>
          </div>
        ) : (
          <div>
            <dt>Expiration</dt>
            <dd>
              {formatDate(invitation.expires_at)} ({formatRelative(invitation.expires_at)})
            </dd>
          </div>
        )}
        <div>
          <dt>Invited By</dt>
          <dd>
            <IconUser width={16} height={16} aria-hidden="true" />
            {inviter?.fullName ?? '—'}
          </dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>
            {invitation.invitation_email_sent_at ? (
              <>
                <IconMail width={16} height={16} aria-hidden="true" />
                Sent {formatShortDate(invitation.invitation_email_sent_at)}
              </>
            ) : (
              <span className="details__status details__status--warning">
                <IconAlertTriangle width={16} height={16} aria-hidden="true" />
                Not delivered
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="details__actions">
        {current === 'pending' && (
          <>
            <button
              type="button"
              className="details__action"
              disabled={resend.isPending}
              onClick={() => resend.mutate(invitation.id)}
            >
              <IconRefresh aria-hidden="true" />
              {resend.isPending
                ? 'Sending…'
                : resend.isSuccess
                  ? 'Sent again'
                  : 'Resend Invitation'}
            </button>
            {confirmCancel ? (
              <div className="details__confirm">
                <p className="details__note">Cancel this invitation? The link stops working.</p>
                <div className="dialog__footer">
                  <Button variant="tint" onClick={() => setConfirmCancel(false)}>
                    Keep it
                  </Button>
                  <Button
                    variant="danger"
                    disabled={revoke.isPending}
                    onClick={() =>
                      revoke.mutate(invitation.id, { onSuccess: () => setConfirmCancel(false) })
                    }
                  >
                    {revoke.isPending ? 'Cancelling…' : 'Cancel it'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="details__action details__action--danger"
                  onClick={() => setConfirmCancel(true)}
                >
                  <IconBan aria-hidden="true" />
                  Cancel Invitation
                </button>
                <p className="details__note">
                  Canceling will immediately revoke secure tokens and join link authorization.
                </p>
              </>
            )}
          </>
        )}
        {CLOSED.includes(current) && invitation.member_category && (
          <button
            type="button"
            className="details__action"
            disabled={send.isPending}
            onClick={reissue}
          >
            <IconSend aria-hidden="true" />
            {send.isPending ? 'Sending…' : 'Send New Invitation'}
          </button>
        )}
        {error && <p className="form-error">{errorMessage(error)}</p>}
      </div>
    </section>
  );
}
