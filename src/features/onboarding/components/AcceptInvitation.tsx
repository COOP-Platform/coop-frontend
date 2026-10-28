import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import { Button, IconEye, IconEyeOff, Input } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/api/client';
import { saveTokens } from '@/lib/auth/session';

import { useAcceptInvitation, usePreviewInvitation, useRejectInvitation } from '../api/invitation';

interface AcceptInvitationProps {
  /** From `#token=` on the emailed link. */
  token?: string;
}

/** A heading and a line or two — every non-form state of the page. */
function Message({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="login-form">
      <div className="login-form__head">
        <h1 className="login-form__title">{title}</h1>
        <p className="login-form__subtitle">{children}</p>
      </div>
      {action}
    </div>
  );
}

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
      <Message title="No invitation in this link">
        Open the link from your invitation email. If you typed the address by hand, part of it is
        missing.
      </Message>
    );
  }

  if (preview.isPending || preview.isIdle) {
    return <Message title="Checking your invitation…">One moment.</Message>;
  }

  if (preview.isError) {
    const status = preview.error instanceof ApiError ? preview.error.status : 0;
    const title =
      status === 404 ? 'This invitation link is not valid' : 'This invitation is closed';
    // The API's own reason (expired, withdrawn, already used), unless it just
    // repeats the heading.
    const reason =
      preview.error instanceof ApiError
        ? preview.error.message.replace(/.$/, '').toLowerCase() === title.toLowerCase()
          ? ''
          : `${preview.error.message} `
        : 'The invitation could not be checked. ';
    return <Message title={title}>{reason}Ask whoever invited you to send a new one.</Message>;
  }

  const invitation = preview.data;

  // Declined: terminal, and there is nothing to sign in to.
  if (reject.isSuccess) {
    return (
      <Message title="Invitation declined">
        You declined the invitation to {reject.data.community_name}. The link no longer works.
      </Message>
    );
  }

  // Accepted with an existing account: no tokens come back, so they sign in.
  if (accept.isSuccess && accept.data.outcome === 'existing_account') {
    return (
      <Message
        title="You're in"
        action={
          <Link to="/login" className="btn btn--primary">
            Sign in
          </Link>
        }
      >
        {invitation.community_name} has been added to your account. Sign in with your usual
        password.
      </Message>
    );
  }

  function handleAccept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (invitation.requires_password && password !== confirmation) {
      setMismatch('Passwords do not match.');
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
            // Signed straight in; `useMe()` fetches the account on the next screen.
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
  const busy = accept.isPending || reject.isPending;

  return (
    <form className="login-form" onSubmit={handleAccept}>
      <div className="login-form__head">
        <h1 className="login-form__title">Join {invitation.community_name}</h1>
        <p className="login-form__subtitle">
          {invitation.requires_password
            ? `You've been invited as ${invitation.email}. Choose a password to accept.`
            : `You already have an account with ${invitation.email}. Accept to add this community to it.`}
        </p>
      </div>

      {invitation.requires_password && (
        <>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            hint="Must be at least 8 characters."
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
            placeholder="••••••••"
            autoComplete="new-password"
            error={mismatch}
            required
          />
        </>
      )}

      {formError && (
        <p className="login-form__error" role="alert">
          {formError}
        </p>
      )}
      {reject.isError && (
        <p className="login-form__error" role="alert">
          {reject.error instanceof ApiError
            ? reject.error.message
            : 'Could not decline the invitation. Try again in a moment.'}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={busy}>
        {accept.isPending ? 'Joining…' : 'Accept invitation'}
      </Button>

      <p className="auth-panel__footer">
        Not for you?{' '}
        <button
          type="button"
          className="accept-decline"
          onClick={() => reject.mutate(token as string)}
          disabled={busy}
        >
          {reject.isPending ? 'Declining…' : 'Decline'}
        </button>
      </p>
    </form>
  );
}
