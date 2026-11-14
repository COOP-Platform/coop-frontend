import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  IconArrowRight,
  IconCheckCircle,
  IconEye,
  IconEyeOff,
  IconLock,
  Input,
} from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { getUser, saveSession } from '@/lib/auth/session';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

import { useChangePassword } from '../api/auth';

/** The backend's AUTH_PASSWORD_VALIDATORS, said up front rather than after a refusal. */
const RULES = [
  'At least 8 characters',
  'Not only numbers',
  'Not a common password, and not too close to your name or email',
];

interface ChangePasswordFormProps {
  /** The account is flagged `must_change_password`: nothing else opens until this is done. */
  required: boolean;
  onSignOut: () => void;
}

/**
 * The same `rememberMe` the user signed in with: session.ts keeps it as a
 * flag in localStorage, and the fresh tokens belong in the same store.
 */
function remembered(): boolean {
  try {
    return localStorage.getItem('coop.persist') === '1';
  } catch {
    return false;
  }
}

export function ChangePasswordForm({ required, onSignOut }: ChangePasswordFormProps) {
  const navigate = useNavigate();
  const change = useChangePassword();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({});
  const [done, setDone] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: typeof errors = {};
    if (password.length < 8) {
      next.password = 'Use at least 8 characters.';
    } else if (/^\d+$/.test(password)) {
      next.password = 'Use some letters too, not only numbers.';
    } else if (password === current) {
      next.password = 'Choose a password different from your current one.';
    }
    if (confirmation !== password) {
      next.confirmation = 'Both new passwords must match.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    change.mutate(
      { current_password: current, new_password: password },
      {
        onSuccess: async (result) => {
          // The API issues a fresh pair: the old refresh token was minted
          // against the password that has just been replaced.
          const user = getUser();
          if (result.access && result.refresh && user) {
            saveSession(result.access, result.refresh, user, remembered());
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
          setDone(true);
        },
      },
    );
  }

  if (done) {
    return (
      <div className="login-form">
        <span className="closeout-success" aria-hidden="true">
          <IconCheckCircle />
        </span>
        <h1 className="login-form__title">Your password is changed</h1>
        <p className="login-form__subtitle">
          Use your new password the next time you sign in, on this device or any other.
        </p>
        <Button variant="primary" onClick={() => void navigate({ to: '/' })}>
          Continue to your community
          <IconArrowRight />
        </Button>
      </div>
    );
  }

  const fieldErrors = change.error instanceof ApiError ? change.error.fieldErrors : {};
  const formError =
    change.error !== null &&
    fieldErrors.current_password === undefined &&
    fieldErrors.new_password === undefined
      ? errorMessage(change.error)
      : undefined;

  const toggle = (
    <button
      type="button"
      className="field__toggle"
      onClick={() => setShowPassword((value) => !value)}
      aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
    >
      {showPassword ? <IconEyeOff /> : <IconEye />}
    </button>
  );

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-form__head">
        <h1 className="login-form__title">
          {required ? 'Choose your own password' : 'Change your password'}
        </h1>
        <p className="login-form__subtitle">
          {required
            ? 'Welcome! You signed in with a password someone else set for you. Choose your own now, so only you can sign in to your account.'
            : 'Enter the password you use today, then the one you want instead.'}
        </p>
      </div>

      <Input
        label="Current password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        value={current}
        onChange={(event) => setCurrent(event.target.value)}
        error={fieldErrors.current_password}
        required
        trailing={toggle}
      />

      <Input
        label="New password"
        type={showPassword ? 'text' : 'password'}
        icon={<IconLock />}
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password ?? fieldErrors.new_password}
        required
      />

      <ul className="password-rules" aria-label="Your new password needs">
        {RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>

      <Input
        label="Confirm new password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        error={errors.confirmation}
        required
      />

      {formError && (
        <p className="login-form__error" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={change.isPending}>
        {change.isPending ? 'Saving…' : 'Save new password'}
      </Button>

      {required ? (
        <button type="button" className="btn btn--secondary" onClick={onSignOut}>
          Sign out instead
        </button>
      ) : (
        <Link to="/" className="btn btn--secondary">
          Cancel
        </Link>
      )}
    </form>
  );
}
