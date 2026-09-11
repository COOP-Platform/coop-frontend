import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconEye,
  IconEyeOff,
  Input,
} from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/api/client';
import { saveTokens } from '@/lib/auth/session';

import { useAcceptInvitation, usePreviewInvitation, useRejectInvitation } from '../api/invitation';
import { ALLOCATION_BENEFITS } from '../data/copy';

interface AcceptInvitationProps {
  /** From `?token=` on the emailed link. */
  token?: string;
}

const LEGAL_NOTE =
  'By accepting, your profile is bonded to the community charter under Rwandan Law ' +
  'N° 02/2010 on Cooperative Societies.';

export function AcceptInvitation({ token }: AcceptInvitationProps) {
  const navigate = useNavigate();

  const preview = usePreviewInvitation();
  const accept = useAcceptInvitation();
  const reject = useRejectInvitation();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mismatch, setMismatch] = useState<string | undefined>(undefined);

  /*
   * Preview is a POST (the token must stay out of the URL), so it is a
   * mutation rather than a query and has to be fired manually. Keyed on the
   * token so a changed link re-checks, and guarded by `isIdle` so React's
   * double-invoked effects in development don't send it twice.
   */
  const { mutate: runPreview, isIdle } = preview;
  useEffect(() => {
    if (token !== undefined && isIdle) {
      runPreview(token);
    }
  }, [token, isIdle, runPreview]);

  if (token === undefined) {
    return (
      <div className="accept">
        <h1 className="accept__title">No invitation in this link</h1>
        <p className="accept__lede">
          Open the link from your invitation email — it carries a token this page needs. If you
          typed the address by hand, some of it is missing.
        </p>
      </div>
    );
  }

  if (preview.isPending || preview.isIdle) {
    return <p className="accept__loading">Checking your invitation…</p>;
  }

  if (preview.isError) {
    const status = preview.error instanceof ApiError ? preview.error.status : 0;
    return (
      <div className="accept">
        <h1 className="accept__title">
          {status === 404 ? 'This invitation link is not valid' : 'This invitation is closed'}
        </h1>
        <p className="accept__lede">
          {preview.error instanceof ApiError
            ? preview.error.message
            : 'The invitation service could not be reached. Try again in a moment.'}
        </p>
        <p className="accept__lede">
          If it was already used, accepted or withdrawn, ask whoever invited you to send a new one.
        </p>
      </div>
    );
  }

  const invitation = preview.data;
  const firstName = invitation.full_name.split(/\s+/)[0] ?? invitation.full_name;

  // Declined: terminal, and there is nothing to sign in to.
  if (reject.isSuccess) {
    return (
      <div className="accept">
        <h1 className="accept__title">Invitation declined</h1>
        <p className="accept__lede">
          You have declined the invitation to {reject.data.community_name}. Nothing was created and
          the link no longer works.
        </p>
      </div>
    );
  }

  /*
   * Accepted by someone who already had an account: no tokens come back, so
   * they have to sign in with the password they already use.
   */
  if (accept.isSuccess && accept.data.outcome === 'existing_account') {
    return (
      <div className="accept">
        <span className="accept__done" aria-hidden="true">
          <IconCheckCircle />
        </span>
        <h1 className="accept__title">You&apos;re in</h1>
        <p className="accept__lede">{accept.data.detail}</p>
        <Link to="/login" className="btn btn--primary">
          Go to Sign In
          <IconArrowRight />
        </Link>
      </div>
    );
  }

  function handleAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (invitation.requires_password && password !== confirmation) {
      setMismatch('Both passwords must match.');
      return;
    }
    setMismatch(undefined);

    accept.mutate(
      {
        token: token as string,
        password: invitation.requires_password ? password : undefined,
      },
      {
        onSuccess: (result) => {
          if (result.access !== undefined && result.refresh !== undefined) {
            /*
             * Signed straight in — there is no separate sign-in step any more.
             * Tokens only: the accept response carries no user id, and
             * `useMe()` fetches the real record on the next screen.
             */
            saveTokens(result.access, result.refresh, false);
            void navigate({ to: '/' });
          }
        },
      },
    );
  }

  const fieldErrors: FieldErrors = accept.error instanceof ApiError ? accept.error.fieldErrors : {};
  const formError =
    accept.error instanceof ApiError
      ? Object.keys(accept.error.fieldErrors).length === 0
        ? accept.error.message
        : (fieldErrors.token ?? undefined)
      : accept.error !== null
        ? 'Something went wrong. Please try again.'
        : undefined;

  return (
    <form className="accept" onSubmit={handleAccept}>
      <div className="accept__status">
        <span className="accept__tag">Invitation</span>
        <span className="accept__verified">Link verified</span>
      </div>

      <header className="accept__intro">
        <h1 className="accept__title">Welcome, {firstName}!</h1>
        <p className="accept__lede">
          You have been invited to join <strong>{invitation.community_name}</strong> as{' '}
          <strong>{invitation.category_name}</strong>, using <strong>{invitation.email}</strong>.
        </p>
      </header>

      <section className="accept__allocation">
        <div className="accept__allocation-head">
          <div>
            <p className="accept__eyebrow">Your category</p>
            <p className="accept__allocation-name">{invitation.category_name}</p>
          </div>
          <span className="accept__approved">Pre-approved</span>
        </div>

        <ul className="accept__benefits" role="list">
          {ALLOCATION_BENEFITS.map((benefit) => (
            <li key={benefit.title} className="accept__benefit">
              <span className="accept__benefit-title">{benefit.title}</span>
              <span className="accept__benefit-detail">{benefit.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      {invitation.requires_password ? (
        <section className="accept__credentials">
          <p className="accept__credentials-title">Choose your password</p>
          <p className="accept__credentials-text">
            This becomes your sign-in password. Nothing is emailed to you, and you will be signed in
            as soon as you accept.
          </p>

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            minLength={8}
            error={fieldErrors.password}
            required
            trailing={
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            }
          />

          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={mismatch}
            required
          />
        </section>
      ) : (
        <p className="accept__existing" role="status">
          This address already has an account, so keep using the password you have — accepting just
          adds {invitation.community_name} to it.
        </p>
      )}

      <p className="accept__expiry">
        <IconClock />
        Invitation expires {new Date(invitation.expires_at).toLocaleDateString()}
      </p>

      {formError && (
        <p className="accept__error" role="alert">
          {formError}
        </p>
      )}

      {reject.isError && (
        <p className="accept__error" role="alert">
          {reject.error instanceof ApiError
            ? reject.error.message
            : 'Could not decline the invitation. Try again in a moment.'}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={accept.isPending || reject.isPending}>
        {accept.isPending ? 'Setting up your account…' : 'Accept Invitation & Continue'}
        <IconArrowRight />
      </Button>

      <p className="accept__secondary">
        <button
          type="button"
          className="accept__decline"
          onClick={() => reject.mutate(token as string)}
          disabled={accept.isPending || reject.isPending}
        >
          {reject.isPending ? 'Declining…' : 'Decline this invitation'}
        </button>
      </p>

      <p className="accept__legal">{LEGAL_NOTE}</p>
    </form>
  );
}
