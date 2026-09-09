import { useNavigate } from '@tanstack/react-router';

import { Button, IconArrowRight, IconClock, IconUsers } from '@/components/ui';
import { useCommunity } from '@/features/communities';
import { ApiError } from '@/lib/api/client';

import { useAcceptInvitation, useInvitation } from '../api/accept';
import { ACTIVATION_STEPS, INVITE_ALLOCATION } from '../data/placeholder';
import { storeAcceptedAccount } from '../data/handoff';

interface AcceptInvitationProps {
  /** From `?id=` on the accept link. */
  invitationId?: string;
}

const LEGAL_NOTE =
  'By accepting, your authenticated profile will be permanently bonded to the collective ' +
  'charter under Rwandan Law N° 02/2010 on Cooperative Societies.';

export function AcceptInvitation({ invitationId }: AcceptInvitationProps) {
  const navigate = useNavigate();

  const invitationQuery = useInvitation(invitationId);
  const invitation = invitationQuery.data;
  const { data: community } = useCommunity(invitation?.community);
  const accept = useAcceptInvitation();

  if (invitationId === undefined) {
    return (
      <div className="accept">
        <h1 className="accept__title">No invitation in this link</h1>
        <p className="accept__lede">
          An invitation link looks like <code>/invitation?id=…</code>. Ask whoever invited you to
          resend theirs.
        </p>
      </div>
    );
  }

  if (invitationQuery.isPending) {
    return <p className="accept__loading">Checking your invitation…</p>;
  }

  if (invitationQuery.isError || invitation === undefined) {
    return (
      <div className="accept">
        <h1 className="accept__title">This invitation could not be found</h1>
        <p className="accept__lede">
          {invitationQuery.error instanceof ApiError && invitationQuery.error.status === 404
            ? 'The link may have been mistyped, or the invitation was withdrawn.'
            : 'The invitation service could not be reached. Try again in a moment.'}
        </p>
      </div>
    );
  }

  const alreadyHandled = invitation.status !== 'pending';
  const expired = new Date(invitation.expires_at).getTime() < Date.now();
  const firstName = invitation.full_name.split(/\s+/)[0] ?? invitation.full_name;
  const communityName = community?.name ?? 'this community';

  function handleAccept() {
    accept.mutate(
      { invitation: invitation as NonNullable<typeof invitation> },
      {
        onSuccess: (result) => {
          storeAcceptedAccount({
            email: result.email,
            temporaryPassword: result.temporaryPassword,
            memberId: result.membershipId,
            communityName,
            roleName: INVITE_ALLOCATION.role,
          });
          void navigate({ to: '/invitation/accepted' });
        },
      },
    );
  }

  return (
    <div className="accept">
      <div className="accept__status">
        <span className="accept__tag">Exclusive invitation</span>
        {alreadyHandled ? (
          <span className="accept__used">Already {invitation.status}</span>
        ) : expired ? (
          <span className="accept__used">Expired</span>
        ) : (
          <span className="accept__verified">Invitation valid</span>
        )}
      </div>

      <header className="accept__intro">
        <h1 className="accept__title">Welcome, {firstName}!</h1>
        <p className="accept__lede">
          You have been invited to join the private governance &amp; mutual finance ledger of{' '}
          <strong>{communityName}</strong>, as <strong>{invitation.email}</strong>.
        </p>
      </header>

      <section className="accept__allocation">
        <div className="accept__allocation-head">
          <div>
            <p className="accept__eyebrow">Designated allocation</p>
            <p className="accept__allocation-name">{INVITE_ALLOCATION.role}</p>
          </div>
          <span className="accept__approved">Pre-approved</span>
        </div>

        <ul className="accept__benefits" role="list">
          {INVITE_ALLOCATION.benefits.map((benefit) => (
            <li key={benefit.title} className="accept__benefit">
              <span className="accept__benefit-title">{benefit.title}</span>
              <span className="accept__benefit-detail">{benefit.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="accept__requirements">
        <p className="accept__requirements-head">
          <span>
            <IconClock />
            Activation Requirements
          </span>
          <span className="accept__requirements-time">Takes ~2 minutes</span>
        </p>

        <ol className="accept__steps">
          {ACTIVATION_STEPS.map((step, index) => (
            <li key={step} className="accept__step">
              <span className="accept__step-number">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <p className="accept__expiry">
          <IconUsers />
          Invitation expires {new Date(invitation.expires_at).toLocaleDateString()}
        </p>
      </section>

      {(alreadyHandled || expired) && (
        <p className="accept__blocked" role="status">
          {alreadyHandled
            ? `This invitation was already ${invitation.status}, so it cannot be used again. If that was not you, contact whoever invited you.`
            : 'This invitation has expired and needs to be reissued before it can be accepted.'}
        </p>
      )}

      {accept.isError && (
        <p className="accept__error" role="alert">
          {accept.error instanceof ApiError
            ? (accept.error.fieldErrors.email ?? accept.error.message)
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      <Button
        type="button"
        variant="primary"
        onClick={handleAccept}
        disabled={accept.isPending || alreadyHandled || expired}
      >
        {accept.isPending ? 'Creating your account…' : 'Accept Invitation & Continue'}
        <IconArrowRight />
      </Button>

      <p className="accept__legal">{LEGAL_NOTE}</p>
    </div>
  );
}
