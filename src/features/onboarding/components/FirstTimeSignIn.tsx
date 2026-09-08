import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  Checkbox,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconKey,
  IconLock,
  IconUser,
  IconWifi,
  Input,
} from '@/components/ui';
import { useLogin } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';

import { INVITE_PREVIEW } from '../data/placeholder';

/**
 * Step 3 of the invite flow. Unlike the rest of these screens this one talks
 * to a real endpoint — `POST /auth/login/` exists and returns
 * `must_change_password`, which is what sends a first-time user on to step 4
 * instead of the dashboard.
 */
export function FirstTimeSignIn() {
  const navigate = useNavigate();

  // Prefilled from the invitation in reality; the placeholder stands in until
  // the token can be resolved.
  // Annotated: the placeholder is `as const`, so inference would pin this
  // state to that one literal string and reject any edit.
  const [identifier, setIdentifier] = useState<string>(INVITE_PREVIEW.inviteeEmail);
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const login = useLogin();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    login.mutate(
      { identifier, password },
      {
        onSuccess: (result) => {
          saveSession(result.access, result.refresh, result.user, rememberDevice);
          void navigate({ to: result.must_change_password ? '/onboarding/password' : '/' });
        },
      },
    );
  }

  return (
    <form className="signin" onSubmit={handleSubmit}>
      <div className="signin__notice">
        <span className="signin__notice-icon" aria-hidden="true">
          <IconKey />
        </span>
        <div>
          <p className="signin__notice-title">
            First-time Setup <span className="signin__notice-step">Step 3 of 4: Sign In</span>
          </p>
          <p className="signin__notice-text">
            You will be prompted to set a permanent, private password immediately after entering
            this temporary token.
          </p>
        </div>
      </div>

      <header className="signin__intro">
        <h1 className="signin__title">Sign In</h1>
        <p className="signin__lede">
          Enter your email and the temporary password sent to your inbox to initialize your account.
        </p>
      </header>

      <Input
        label="Email or Username"
        type="text"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        icon={<IconUser />}
        autoComplete="username"
        required
      />

      <div className="signin__password">
        <Input
          label="Temporary Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          icon={<IconLock />}
          autoComplete="current-password"
          hint="Temporary code expires in 48 hours"
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
        {/* TODO: needs an endpoint that re-issues the temporary password. */}
        <a href="#" className="signin__lost">
          Lost temporary password?
        </a>
      </div>

      <Checkbox
        label="Remember this device for 30 days"
        checked={rememberDevice}
        onChange={(event) => setRememberDevice(event.target.checked)}
      />

      {login.isError && (
        <p className="signin__error" role="alert">
          {login.error instanceof ApiError
            ? login.error.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={login.isPending}>
        {login.isPending ? 'Verifying…' : 'Sign In & Verify'}
        <IconArrowRight />
      </Button>

      <p className="signin__divider">
        <span>Or continue with</span>
      </p>

      {/* No SSO provider is configured — disabled rather than dead. */}
      <Button type="button" variant="secondary" disabled>
        Family Portal SSO
      </Button>

      <p className="signin__mesh">
        <span className="signin__mesh-icon" aria-hidden="true">
          <IconWifi />
        </span>
        <span className="signin__mesh-text">
          <span className="signin__mesh-title">Direct Mesh Connection</span>
          <span className="signin__mesh-detail">Kigali Vault · Node 04</span>
        </span>
        <span className="signin__mesh-tls">TLS 1.3 Strict</span>
      </p>

      <p className="signin__legal">
        Secure encrypted family server. Protected under customary bylaws of Les Cousins Family
        Council.
      </p>
    </form>
  );
}
