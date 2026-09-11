import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, IconAtSign, IconArrowRight, Input } from '@/components/ui';
import { ApiError } from '@/lib/api/client';

import { useRequestPasswordReset } from '../api/password-reset';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const request = useRequestPasswordReset();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    request.mutate(email.trim());
  }

  if (request.isSuccess) {
    return (
      <div className="login-form">
        <h2 className="login-form__title">Check your email</h2>
        {/*
          The API answers identically whether or not the address is
          registered, so this shows its message rather than promising an email
          that may not be coming.
        */}
        <p className="login-form__subtitle">{request.data.detail}</p>
        <p className="login-form__subtitle">
          The link is valid for a short time. If nothing arrives, check spam and try again.
        </p>
        <Link to="/login" className="btn btn--secondary">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <h2 className="login-form__title">Reset your password</h2>
      <p className="login-form__subtitle">
        Enter the email on your account and we will send you a link to set a new password.
      </p>

      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        icon={<IconAtSign />}
        autoComplete="email"
        required
      />

      {request.isError && (
        <p className="login-form__error" role="alert">
          {request.error instanceof ApiError
            ? request.error.message
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={request.isPending}>
        {request.isPending ? 'Sending…' : 'Send reset link'}
        <IconArrowRight />
      </Button>

      <p className="login-form__row">
        <Link to="/login" className="login-form__forgot">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
