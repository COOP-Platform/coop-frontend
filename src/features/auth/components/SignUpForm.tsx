import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, IconEye, IconEyeOff, IconLock, IconMail, IconUser, Input } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';

import { ExistingAccountError, useSignUp } from '../api/auth';

const MIN_PASSWORD = 8;

/** Show/hide toggle shared by both password fields. */
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
 * Account first, community second: this creates the person only. Once signed
 * in they land on onboarding, where founding a community is the next step.
 */
export function SignUpForm() {
  const navigate = useNavigate();
  const signUp = useSignUp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Only judged once the user has left the field or submitted — flagging a
  // mismatch on the first keystroke of the confirmation is just noise.
  const [confirmTouched, setConfirmTouched] = useState(false);

  const mismatch = confirmTouched && confirm !== '' && confirm !== password;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfirmTouched(true);

    if (confirm !== password) {
      return;
    }

    signUp.mutate(
      { full_name: fullName.trim(), email: email.trim().toLowerCase(), password },
      {
        onSuccess: (result) => {
          saveSession(result.access, result.refresh, result.user, false);
          void navigate({ to: '/onboarding' });
        },
      },
    );
  }

  const fieldErrors: FieldErrors = signUp.error instanceof ApiError ? signUp.error.fieldErrors : {};

  // Field errors show against their field; anything else (throttling, a 5xx,
  // the network) needs the banner or the button just appears to do nothing.
  let formError: string | undefined;
  if (signUp.error instanceof ApiError) {
    if (Object.keys(fieldErrors).length === 0) {
      formError = signUp.error.message;
    }
  } else if (signUp.error !== null && !(signUp.error instanceof ExistingAccountError)) {
    formError = 'Something went wrong. Please try again.';
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div>
        <h1 className="login-form__title">Create Account</h1>
        <p className="login-form__subtitle signup-form__subtitle">
          Join your community cooperative and participate with full transparency.
        </p>
      </div>

      <Input
        label="Full Name"
        placeholder="e.g. Diane Mukamana"
        autoComplete="name"
        icon={<IconUser />}
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        minLength={2}
        maxLength={120}
        error={fieldErrors.full_name}
        required
      />

      <Input
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        icon={<IconMail />}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        maxLength={255}
        error={fieldErrors.email}
        required
      />

      <Input
        label="Password"
        aside={`Min. ${MIN_PASSWORD} characters`}
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••••••"
        autoComplete="new-password"
        icon={<IconLock />}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={MIN_PASSWORD}
        error={fieldErrors.password}
        required
        trailing={
          <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
        }
      />

      <Input
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        placeholder="••••••••••••"
        autoComplete="new-password"
        icon={<IconLock />}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
        onBlur={() => setConfirmTouched(true)}
        error={mismatch ? 'Passwords do not match.' : undefined}
        required
        trailing={<PasswordToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />}
      />

      {signUp.error instanceof ExistingAccountError && (
        <p className="login-form__error" role="alert">
          A user with this email already exists.
        </p>
      )}

      {formError && (
        <p className="login-form__error" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={signUp.isPending}>
        {signUp.isPending ? 'Creating account…' : 'Create Account'}
      </Button>

      <p className="signup-form__foot">
        <IconLock width={14} height={14} />
        Secure encrypted connection
      </p>
    </form>
  );
}
