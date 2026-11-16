import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Checkbox, IconEye, IconEyeOff, Input } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { saveSession } from '@/lib/auth/session';

import { useLogin } from '../api/auth';

export function LoginForm() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const login = useLogin();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const next: typeof errors = {};
    const trimmed = identifier.trim();
    if (trimmed === '') {
      next.identifier = 'Enter the email you signed up or were invited with.';
    } else if (!trimmed.includes('@') && !/^\+?[\d\s]{7,}$/.test(trimmed)) {
      next.identifier = 'That does not look like an email address. Check for a missing "@".';
    }
    if (password === '') {
      next.password = 'Enter your password.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      return;
    }

    // `rememberMe` is a client-side concern — it picks the token store — so it
    // is deliberately not part of the request body.
    login.mutate(
      { identifier: trimmed, password },
      {
        onSuccess: (result) => {
          saveSession(result.access, result.refresh, result.user, rememberMe);
          /*
           * An invited member sets their own password when accepting, and a
           * reset sets a real one too, so `must_change_password` should never
           * be true here. If the API ever sets it, the change comes first
           * (the route guards enforce the same on every other page).
           */
          void navigate({ to: result.must_change_password ? '/account/password' : '/' });
        },
      },
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <div className="login-form__head">
        <h1 className="login-form__title">Welcome back</h1>
        <p className="login-form__subtitle">Sign in with your email and password.</p>
      </div>

      <Input
        label="Email"
        type="text"
        placeholder="Enter your email"
        autoComplete="username"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        error={errors.identifier}
        inputMode="email"
        required
      />

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors.password}
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

      <div className="login-form__row">
        <Checkbox
          label="Remember me"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
        />
        <Link to="/forgot-password" className="login-form__forgot">
          Forgot password?
        </Link>
      </div>

      {login.isError && (
        <p className="login-form__error" role="alert">
          {login.error instanceof ApiError && login.error.status === 401
            ? 'Your email or password is not right. Check both and try again, or use "Forgot password?".'
            : errorMessage(login.error)}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      {/* Invited members choose their password from the invitation email first. */}
      <p className="login-form__invited">Invited? Open the link in your invitation email first.</p>
    </form>
  );
}
