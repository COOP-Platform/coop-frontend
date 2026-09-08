import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Checkbox, IconEye, IconEyeOff, IconLock, IconUser, Input } from '@/components/ui';
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
          void navigate({ to: result.must_change_password ? '/onboarding/password' : '/' });
        },
      },
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2 className="login-form__title">Sign In</h2>
      <p className="login-form__subtitle">Enter your credentials to access your dashboard.</p>

      <Input
        label="Email or Username"
        type="text"
        placeholder="you@example.com"
        autoComplete="username"
        icon={<IconUser />}
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        required
      />

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••"
        autoComplete="current-password"
        icon={<IconLock />}
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
        {/* TODO: point at the reset-password screen once it exists. */}
        <a href="#" className="login-form__forgot">
          Forgot password?
        </a>
      </div>

      {login.isError && (
        <p className="login-form__error" role="alert">
          {login.error instanceof ApiError
            ? login.error.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign In to Dashboard'}
      </Button>
    </form>
  );
}
