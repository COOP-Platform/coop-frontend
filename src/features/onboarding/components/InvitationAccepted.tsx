import { Link } from '@tanstack/react-router';

import { IconArrowRight, IconCheckCircle, IconCopy, IconMail } from '@/components/ui';

import { ACCOUNT_SUMMARY, INVITE_PREVIEW } from '../data/placeholder';

export function InvitationAccepted() {
  return (
    <div className="accepted">
      <p className="accepted__step">Step 2 of 4 · Invitation accepted</p>

      <span className="accepted__check" aria-hidden="true">
        <IconCheckCircle />
      </span>

      <header className="accepted__intro">
        <h1 className="accepted__title">You&apos;re all set!</h1>
        <p className="accepted__lede">
          Account created successfully for <strong>{INVITE_PREVIEW.communityName}</strong>{' '}
          community.
        </p>
      </header>

      <section className="accepted__dispatch">
        <div className="accepted__dispatch-head">
          <span className="accepted__dispatch-icon" aria-hidden="true">
            <IconMail />
          </span>
          <p className="accepted__dispatch-title">Credentials dispatched</p>
          <span className="accepted__verified">Verified</span>
        </div>
        <p className="accepted__dispatch-text">
          We have generated your secure account. Your temporary login password and verification link
          have been dispatched to <strong>{INVITE_PREVIEW.inviteeEmail}</strong>.
        </p>
      </section>

      <dl className="accepted__summary">
        <div className="accepted__row">
          <dt>Member ID</dt>
          <dd>
            <span className="accepted__copy" aria-hidden="true">
              <IconCopy />
            </span>
            {ACCOUNT_SUMMARY.memberId}
          </dd>
        </div>
        <div className="accepted__row">
          <dt>Assigned Community</dt>
          <dd>{ACCOUNT_SUMMARY.community}</dd>
        </div>
        <div className="accepted__row">
          <dt>Access Level / Role</dt>
          <dd>{ACCOUNT_SUMMARY.role}</dd>
        </div>
      </dl>

      <Link to="/onboarding/sign-in" className="btn btn--primary">
        Go to Sign In
        <IconArrowRight />
      </Link>

      <p className="accepted__resend">
        Didn&apos;t receive the email?{' '}
        {/* TODO: needs an endpoint that re-dispatches the credential email. */}
        <a href="#">Check spam or resend credentials</a>
      </p>
    </div>
  );
}
