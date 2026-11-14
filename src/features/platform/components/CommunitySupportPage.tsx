import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Badge,
  Button,
  EmptyState,
  IconAlertTriangle,
  IconArrowLeft,
  IconEye,
  IconHistory,
  Textarea,
} from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import {
  SUPPORT_READ_ACTION,
  SUPPORT_REASON_MIN_LENGTH,
  useOpenSupportView,
  usePlatformCommunities,
} from '../api/platform';
import type { SupportView } from '../api/platform';
import { formatDateTime, typeLabel } from '../labels';
import { PlatformHeader } from './PlatformHeader';

const REASON_MAX = 500;

/**
 * `/platform/communities/$communityId`: one community's records, read-only,
 * for troubleshooting. The API writes an audit entry — who, when and why —
 * before it returns anything, so the page asks for the reason first and says
 * plainly that the look is logged.
 */
export function CommunitySupportPage({ communityId }: { communityId: string }) {
  const directory = usePlatformCommunities();
  const open = useOpenSupportView();
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);

  const listed = directory.data?.find((c) => c.id === communityId);
  const name = open.data?.community.name ?? listed?.name ?? 'this community';

  const trimmed = reason.trim();
  const clientError =
    attempted && trimmed.length < SUPPORT_REASON_MIN_LENGTH
      ? `Say why you are opening it, in at least ${SUPPORT_REASON_MIN_LENGTH} characters — a support ticket number is enough.`
      : undefined;
  const serverError = open.error instanceof ApiError ? open.error.fieldErrors.reason : undefined;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    if (trimmed.length < SUPPORT_REASON_MIN_LENGTH) {
      return;
    }
    open.mutate({ communityId, reason: trimmed });
  }

  return (
    <div className="page">
      <PlatformHeader
        title={open.data ? name : 'Support view'}
        subtitle={
          open.data
            ? `${typeLabel(open.data.community.type)} · read-only · no money is shown here`
            : `Look at ${name}'s members and invitations, read-only, to help with a problem.`
        }
        actions={
          <Link to="/platform/communities" className="link-action">
            <IconArrowLeft width={16} height={16} aria-hidden="true" />
            All communities
          </Link>
        }
      />

      {open.data ? (
        <SupportRecords
          view={open.data}
          onClose={() => {
            open.reset();
            setReason('');
            setAttempted(false);
          }}
        />
      ) : (
        <form className="card platform-support-form" onSubmit={handleSubmit} noValidate>
          <div className="notice notice--warning" role="note">
            <IconAlertTriangle width={20} height={20} aria-hidden="true" />
            <div>
              <p className="notice__title">Opening this community is logged</p>
              <p className="notice__text">
                Your name, the time and the reason you give are written to {name}&apos;s own audit
                log before anything is shown, and its administrators can read it. Everything you see
                is read-only, and it never includes contributions, expenses or balances.
              </p>
            </div>
          </div>

          <Textarea
            label="Why are you opening it?"
            hint="For example the support ticket number, or what the community asked for help with."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={REASON_MAX}
            rows={3}
            error={clientError ?? serverError}
            required
          />

          {open.isError && serverError === undefined && (
            <p className="form-error" role="alert">
              {errorMessage(open.error)}
            </p>
          )}

          <div className="platform-support-form__actions">
            <Button type="submit" inline icon={<IconEye />} disabled={open.isPending}>
              {open.isPending ? 'Opening…' : 'Open read-only and log it'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const MEMBER_STATUS: Record<
  SupportView['memberships'][number]['status'],
  { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }
> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'info' },
  suspended: { label: 'Suspended', tone: 'warning' },
  removed: { label: 'Removed', tone: 'neutral' },
};

function SupportRecords({ view, onClose }: { view: SupportView; onClose: () => void }) {
  const { community, memberships, invitations } = view;

  return (
    <>
      <div className="notice notice--info" role="status">
        <IconHistory width={20} height={20} aria-hidden="true" />
        <div>
          <p className="notice__title">This look was logged (entry #{view.audit_entry_id})</p>
          <p className="notice__text">
            It is in {community.name}&apos;s audit log with your name and reason.{' '}
            <Link
              to="/platform/audit-log"
              search={{ community: community.id, action: SUPPORT_READ_ACTION }}
              className="link-action"
            >
              See support looks at this community
            </Link>
          </p>
        </div>
      </div>

      <section className="card platform-section" aria-labelledby="support-profile">
        <h2 id="support-profile" className="section-head__title">
          Profile
        </h2>
        <dl className="platform-facts">
          <div>
            <dt>Status</dt>
            <dd>{typeLabel(community.status)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{typeLabel(community.type)}</dd>
          </div>
          <div>
            <dt>Currency · language</dt>
            <dd>
              {community.currency} · {community.language}
            </dd>
          </div>
          <div>
            <dt>Contact email</dt>
            <dd>{community.contact_email ?? '—'}</dd>
          </div>
          <div>
            <dt>Contact phone</dt>
            <dd>{community.contact_phone ?? '—'}</dd>
          </div>
          <div>
            <dt>On the platform since</dt>
            <dd>{formatDate(community.created_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="card table-card" aria-labelledby="support-members">
        <header className="table-card__head">
          <h2 id="support-members" className="section-head__title">
            Members ({memberships.length})
          </h2>
          <p className="section-head__subtitle">Who is in it, and in which positions.</p>
        </header>
        {memberships.length === 0 ? (
          <EmptyState title="No members" />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Status</th>
                  <th scope="col">Positions</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {memberships.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="table__stack">
                        <span className="table__name">{m.full_name}</span>
                        <span className="table__muted">{m.member_category}</span>
                      </span>
                    </td>
                    <td>
                      <Badge tone={MEMBER_STATUS[m.status].tone}>
                        {MEMBER_STATUS[m.status].label}
                      </Badge>
                    </td>
                    <td>{m.positions.length > 0 ? m.positions.join(', ') : '—'}</td>
                    <td>{m.join_date ? formatDate(m.join_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card table-card" aria-labelledby="support-invitations">
        <header className="table-card__head">
          <h2 id="support-invitations" className="section-head__title">
            Invitations ({invitations.length})
          </h2>
          <p className="section-head__subtitle">
            Whether each invitation&apos;s emails actually went out.
          </p>
        </header>
        {invitations.length === 0 ? (
          <EmptyState title="No invitations" />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col">Invitation email</th>
                  <th scope="col">Expires</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{typeLabel(invitation.status)}</td>
                    <td>
                      {invitation.invitation_email_sent_at ? (
                        <span className="table__muted">
                          Sent {formatDateTime(invitation.invitation_email_sent_at)}
                        </span>
                      ) : (
                        <Badge tone="warning">Never sent</Badge>
                      )}
                    </td>
                    <td>{formatDate(invitation.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div>
        <Button variant="secondary" inline onClick={onClose}>
          Close the support view
        </Button>
      </div>
    </>
  );
}
