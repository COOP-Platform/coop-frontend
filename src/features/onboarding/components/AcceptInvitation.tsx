import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import {
  Button,
  IconArrowRight,
  IconCheckCircle,
  IconEye,
  IconEyeOff,
  Input,
} from '@/components/ui';
import { meQueryOptions, selectCommunity, useLogin } from '@/features/auth';
import type { CurrentUser } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { clearSession, isSignedIn, saveSession, saveTokens } from '@/lib/auth/session';
import { queryClient } from '@/lib/query-client';

import { useAcceptInvitation, usePreviewInvitation, useRejectInvitation } from '../api/invitation';
import type { InvitationPreview } from '../api/invitation';

interface AcceptInvitationProps {
  /** From `#token=` on the emailed link. */
  token?: string;
}

/** A heading and a line or two — every non-form state of the page. */
function Message({
  title,
  children,
  action,
  success = false,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  success?: boolean;
}) {
  return (
    <div className="login-form">
      {success && (
        <span className="closeout-success" aria-hidden="true">
          <IconCheckCircle />
        </span>
      )}
      <div className="login-form__head">
        <h1 className="login-form__title">{title}</h1>
        <p className="login-form__subtitle">{children}</p>
      </div>
      {action}
    </div>
  );
}

/** Why a link no longer works, in the words the invitee needs. */
function closedInvitation(error: unknown): { title: string; message: ReactNode } {
  if (error instanceof ApiError && error.status === 404) {
    return {
      title: 'This invitation link is not valid',
      message:
        'The link may be incomplete. Open it straight from your invitation email, or ask whoever invited you to send a new one.',
    };
  }
  const text = error instanceof ApiError ? error.message.toLowerCase() : '';
  if (text.includes('already been accepted')) {
    return {
      title: 'This invitation has already been used',
      message: (
        <>
          You have probably joined already. <Link to="/login">Sign in</Link> with your email to open
          the community.
        </>
      ),
    };
  }
  if (text.includes('expired')) {
    return {
      title: 'This invitation has expired',
      message: 'Invitations last 14 days. Ask whoever invited you to send a new one.',
    };
  }
  if (text.includes('revoked') || text.includes('withdrawn')) {
    return {
      title: 'This invitation was withdrawn',
      message: 'The community cancelled it. Ask them if you think this is a mistake.',
    };
  }
  return {
    title: 'We could not open this invitation',
    message: `${errorMessage(error)} Ask whoever invited you to send a new one if this keeps happening.`,
  };
}

/** After joining: work in the new community, found in the refreshed /auth/me by name. */
async function openJoinedCommunity(communityName: string): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: meQueryOptions.queryKey });
  const me: CurrentUser = await queryClient.fetchQuery(meQueryOptions);
  const joined = me.memberships.find(
    (m) => m.community.name === communityName && m.status !== 'removed',
  );
  if (joined) {
    selectCommunity(joined.community.id);
  }
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="field__toggle"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
    >
      {shown ? <IconEyeOff /> : <IconEye />}
    </button>
  );
}

/**
 * The emailed invitation link (S2-21). Three paths, from the preview's
 * `requires_password` and the browser's session:
 *
 * - **New person** — choose a password; the API creates the account and
 *   signs them in. Confirmation, then on to the community.
 * - **Existing account, not signed in** (or signed in as someone else) —
 *   sign in here with that account's password, then accept. No password is
 *   created.
 * - **Existing account, signed in as it** — one button, no form.
 */
export function AcceptInvitation({ token }: AcceptInvitationProps) {
  const preview = usePreviewInvitation();

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
    const closed = closedInvitation(preview.error);
    return <Message title={closed.title}>{closed.message}</Message>;
  }

  return <InvitationAnswer token={token} invitation={preview.data} />;
}

function InvitationAnswer({ token, invitation }: { token: string; invitation: InvitationPreview }) {
  const navigate = useNavigate();
  const accept = useAcceptInvitation();
  const reject = useRejectInvitation();
  const login = useLogin();

  // Who this browser is signed in as, if anyone: decides between a sign-in
  // form and a single Accept button for an existing account.
  const [signedInAs, setSignedInAs] = useState<CurrentUser | null | undefined>(
    isSignedIn() ? undefined : null,
  );
  useEffect(() => {
    if (signedInAs !== undefined) return;
    queryClient
      .fetchQuery(meQueryOptions)
      .then((me) => setSignedInAs(me))
      .catch(() => setSignedInAs(null));
  }, [signedInAs]);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [joined, setJoined] = useState(false);
  const [opening, setOpening] = useState(false);

  const isNew = invitation.requires_password;
  const sameAccount =
    signedInAs != null && signedInAs.email.toLowerCase() === invitation.email.toLowerCase();

  if (signedInAs === undefined) {
    return <Message title="Checking your invitation…">One moment.</Message>;
  }

  if (reject.isSuccess) {
    return (
      <Message title="Invitation declined">
        You declined the invitation to {reject.data.community_name}. The link no longer works.
      </Message>
    );
  }

  async function goToCommunity() {
    setOpening(true);
    try {
      await openJoinedCommunity(invitation.community_name);
    } finally {
      void navigate({ to: '/' });
    }
  }

  if (joined) {
    return (
      <Message
        success
        title={`Welcome to ${invitation.community_name}`}
        action={
          <Button variant="primary" onClick={() => void goToCommunity()} disabled={opening}>
            {opening ? 'Opening…' : `Go to ${invitation.community_name}`}
            <IconArrowRight />
          </Button>
        }
      >
        {isNew
          ? `Your account is ready and you are signed in. Next time, sign in with ${invitation.email} and the password you just chose.`
          : `${invitation.community_name} is now on your account, next to any other communities you belong to.`}
      </Message>
    );
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (isNew) {
      if (password.length < 8) next.password = 'Use at least 8 characters.';
      else if (/^\d+$/.test(password)) next.password = 'Use some letters too, not only numbers.';
      if (confirmation !== password) next.confirmation = 'Both passwords must match.';
    } else if (!sameAccount && password === '') {
      next.password = 'Enter the password you use to sign in.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function runAccept() {
    accept.mutate(
      { token, password: isNew ? password : undefined },
      {
        onSuccess: (result) => {
          if (result.access !== undefined && result.refresh !== undefined) {
            // A new account: the API signs them straight in. Anything cached
            // belongs to whoever this browser was signed in as before.
            queryClient.clear();
            saveTokens(result.access, result.refresh, false);
          }
          setJoined(true);
        },
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    if (isNew || sameAccount) {
      runAccept();
      return;
    }

    // Existing account, not signed in as it: prove it is theirs first, so
    // nothing is accepted on a mistyped password.
    login.mutate(
      { identifier: invitation.email, password },
      {
        onSuccess: (result) => {
          queryClient.clear();
          saveSession(result.access, result.refresh, result.user, false);
          runAccept();
        },
      },
    );
  }

  const acceptFields: FieldErrors =
    accept.error instanceof ApiError ? accept.error.fieldErrors : {};
  const formError =
    login.error !== null
      ? login.error instanceof ApiError && login.error.status === 401
        ? undefined
        : errorMessage(login.error)
      : accept.error !== null && acceptFields.password === undefined
        ? // The API's reasons (expired, withdrawn, already used) are already plain sentences.
          errorMessage(accept.error)
        : undefined;
  const loginPasswordError =
    login.error instanceof ApiError && login.error.status === 401
      ? 'That password is not right for this account. Try again, or use "Forgot password?".'
      : undefined;
  const busy = accept.isPending || reject.isPending || login.isPending;

  const subtitle = isNew
    ? `You've been invited as ${invitation.email}${invitation.category_name ? ` (${invitation.category_name})` : ''}. Choose a password to create your account and join.`
    : sameAccount
      ? `You're signed in as ${invitation.email}. Accept to add ${invitation.community_name} to your account.`
      : `You already have an account with ${invitation.email}. Sign in with its password to accept.`;

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-form__head">
        <h1 className="login-form__title">Join {invitation.community_name}</h1>
        <p className="login-form__subtitle">{subtitle}</p>
      </div>

      {signedInAs !== null && !sameAccount && (
        <p className="login-form__invited">
          This browser is signed in as {signedInAs.email}.{' '}
          {isNew
            ? `Accepting creates a new account for ${invitation.email} and signs you in as it.`
            : `Signing in below switches to ${invitation.email}.`}{' '}
          <button
            type="button"
            className="accept-decline"
            onClick={() => {
              clearSession();
              queryClient.clear();
              setSignedInAs(null);
            }}
          >
            Sign out of {signedInAs.email}
          </button>
        </p>
      )}

      {isNew && (
        <>
          <Input
            label="Choose a password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            hint="At least 8 characters, not only numbers, and not too close to your name or email."
            error={errors.password ?? acceptFields.password}
            required
            trailing={
              <PasswordToggle
                shown={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
            }
          />
          <Input
            label="Confirm password"
            type={showPassword ? 'text' : 'password'}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            error={errors.confirmation}
            required
          />
        </>
      )}

      {!isNew && !sameAccount && (
        <>
          <Input
            label="Email"
            type="email"
            value={invitation.email}
            autoComplete="username"
            readOnly
          />
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            error={errors.password ?? loginPasswordError}
            required
            trailing={
              <PasswordToggle
                shown={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
              />
            }
          />
          <Link to="/forgot-password" className="login-form__forgot">
            Forgot password?
          </Link>
        </>
      )}

      {formError && (
        <p className="login-form__error" role="alert">
          {formError}
        </p>
      )}
      {reject.isError && (
        <p className="login-form__error" role="alert">
          {errorMessage(reject.error)}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={busy}>
        {login.isPending
          ? 'Signing in…'
          : accept.isPending
            ? 'Joining…'
            : isNew
              ? 'Create account and join'
              : sameAccount
                ? 'Accept invitation'
                : 'Sign in and join'}
      </Button>

      <p className="auth-panel__footer">
        Not for you?{' '}
        <button
          type="button"
          className="accept-decline"
          onClick={() => reject.mutate(token)}
          disabled={busy}
        >
          {reject.isPending ? 'Declining…' : 'Decline'}
        </button>
      </p>
    </form>
  );
}
