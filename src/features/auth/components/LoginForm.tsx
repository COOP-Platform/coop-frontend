import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Checkbox, IconEye, IconEyeOff, Input } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';

import { useLogin } from '../api/auth';

export function LoginForm() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const login = useLogin();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // `rememberMe` is a client-side concern — it picks the token store — so it
    // is deliberately not part of the request body.
    login.mutate(
      { identifier, password },
      {
        onSuccess: (result) => {
          saveSession(result.access, result.refresh, result.user, rememberMe);
          /*
           * No forced-password-change screen any more: an invited member sets
           * their own password when accepting, and a reset sets a real one
           * too, so `must_change_password` should never be true here. If a
           * path ever sets it again, this is where that screen hooks in.
           */
          void navigate({ to: '/' });
        },
      },
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-form__head">
        <h1 className="login-form__title">Welcome back</h1>
        <p className="login-form__subtitle">Please enter your details.</p>
      </div>

      <Input
        label="Email"
        type="text"
        placeholder="Enter your email"
        autoComplete="username"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        required
      />

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
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
          {login.error instanceof ApiError
            ? login.error.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
