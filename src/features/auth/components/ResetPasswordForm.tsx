import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, IconArrowRight, IconEye, IconEyeOff, IconLock, Input } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/api/client';

import { useConfirmPasswordReset } from '../api/password-reset';

interface ResetPasswordFormProps {
  /** From `#token=` on the emailed link. */
  token?: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const navigate = useNavigate();
  const confirm = useConfirmPasswordReset();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mismatch, setMismatch] = useState<string | undefined>(undefined);

  if (token === undefined) {
    return (
      <div className="login-form">
        <h2 className="login-form__title">This reset link is incomplete</h2>
        <p className="login-form__subtitle">
          Open the link straight from your email — it carries a token this page needs. Copying only
          part of the address drops it.
        </p>
        <Link to="/login" className="btn btn--secondary">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (confirm.isSuccess) {
    return (
      <div className="login-form">
        <h2 className="login-form__title">Password updated</h2>
        <p className="login-form__subtitle">{confirm.data.detail}</p>
        <Link to="/login" className="btn btn--primary">
          Sign in
          <IconArrowRight />
        </Link>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmation) {
      setMismatch('Both passwords must match.');
      return;
    }
    setMismatch(undefined);

    confirm.mutate(
      { token: token as string, new_password: password },
      { onSuccess: () => void navigate({ to: '/login' }) },
    );
  }

  const fieldErrors: FieldErrors =
    confirm.error instanceof ApiError ? confirm.error.fieldErrors : {};

  // A dead or expired link reports against `token`, which has no input here,
  // so it has to surface as a form-level message.
  const formError =
    confirm.error instanceof ApiError
      ? (fieldErrors.token ??
        (Object.keys(fieldErrors).length === 0 ? confirm.error.message : undefined))
      : confirm.error !== null
        ? 'Something went wrong. Please try again.'
        : undefined;

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2 className="login-form__title">Set a new password</h2>
      <p className="login-form__subtitle">
        Choose a password you have not used here before. You will sign in with it straight after.
      </p>

      <Input
        label="New password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="At least 8 characters"
        icon={<IconLock />}
        autoComplete="new-password"
        minLength={8}
        error={fieldErrors.new_password}
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
        label="Confirm new password"
        type={showPassword ? 'text' : 'password'}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder="Re-enter your new password"
        autoComplete="new-password"
        error={mismatch}
        required
      />

      {formError && (
        <p className="login-form__error" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={confirm.isPending}>
        {confirm.isPending ? 'Saving…' : 'Set new password'}
        <IconArrowRight />
      </Button>
    </form>
  );
}
