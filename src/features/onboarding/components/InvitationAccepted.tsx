import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { IconArrowRight, IconCheckCircle, IconKey, IconMail } from '@/components/ui';

import { takeAcceptedAccount } from '../data/handoff';

export function InvitationAccepted() {
  // Read once on mount: the handoff clears itself, so this must not re-read on
  // every render or a refresh would blank the screen.
  const [account] = useState(takeAcceptedAccount);

  return (
    <div className="accepted">
      <p className="accepted__step">Step 2 of 4 · Invitation accepted</p>

      <span className="accepted__check" aria-hidden="true">
        <IconCheckCircle />
      </span>

      <header className="accepted__intro">
        <h1 className="accepted__title">You&apos;re all set!</h1>
        <p className="accepted__lede">
          {account === null ? (
            'Your account has been created.'
          ) : (
            <>
              Account created successfully for <strong>{account.communityName}</strong>.
            </>
          )}
        </p>
      </header>

      {account === null ? (
        /*
         * No handoff: the screen was opened directly or refreshed, which
         * consumes the one-shot value. The credentials cannot be shown again
         * because the temporary password is not stored anywhere.
         */
        <section className="accepted__dispatch">
          <div className="accepted__dispatch-head">
            <span className="accepted__dispatch-icon" aria-hidden="true">
              <IconMail />
            </span>
            <p className="accepted__dispatch-title">Credentials already shown</p>
          </div>
          <p className="accepted__dispatch-text">
            Your temporary password was displayed once, on the previous step, and is not stored. If
            you did not copy it, ask whoever invited you to reissue the invitation.
          </p>
        </section>
      ) : (
        <>
          {/*
            The design says these are emailed. Nothing sends mail yet, so they
            are shown here instead — the only way the invitee can get them.
          */}
          <section className="accepted__credentials">
            <div className="accepted__dispatch-head">
              <span className="accepted__dispatch-icon" aria-hidden="true">
                <IconKey />
              </span>
              <p className="accepted__dispatch-title">Your temporary password</p>
              <span className="accepted__once">Shown once</span>
            </div>
            <p className="accepted__dispatch-text">
              Copy this now. No email was sent — the API has no mail step — and it is not stored
              anywhere, so it cannot be shown again. You will replace it immediately after signing
              in.
            </p>
            <code className="accepted__password">{account.temporaryPassword}</code>
            <p className="accepted__signin-as">
              Sign in as <strong>{account.email}</strong>
            </p>
          </section>

          <dl className="accepted__summary">
            <div className="accepted__row">
              <dt>Member ID</dt>
              <dd>
                <code>{account.memberId.slice(0, 8)}</code>
              </dd>
            </div>
            <div className="accepted__row">
              <dt>Assigned Community</dt>
              <dd>{account.communityName}</dd>
            </div>
            <div className="accepted__row">
              <dt>Access Level / Role</dt>
              <dd>{account.roleName}</dd>
            </div>
          </dl>
        </>
      )}

      <Link to="/onboarding/sign-in" className="btn btn--primary">
        Go to Sign In
        <IconArrowRight />
      </Link>
    </div>
  );
}
