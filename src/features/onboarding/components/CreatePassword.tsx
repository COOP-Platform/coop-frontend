import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  IconArrowRight,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconLock,
  Input,
} from '@/components/ui';
import { useChangePassword } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { getUser } from '@/lib/auth/session';

interface Rule {
  id: string;
  label: string;
  test: (value: string) => boolean;
}

/** Mirrors the design's checklist. `RegisterSerializer` enforces only min 8. */
const RULES: readonly Rule[] = [
  { id: 'length', label: '8+ characters minimum', test: (v) => v.length >= 8 },
  { id: 'upper', label: 'Uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'digit', label: 'At least one number (0-9)', test: (v) => /\d/.test(v) },
  { id: 'symbol', label: 'Special symbol (!@#$%^&*)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_LABELS = ['Enter passphrase', 'Weak', 'Fair', 'Good', 'Strong'] as const;

const ADVICE =
  'Avoid using personal family member names, telephone numbers, or easily guessable ' +
  'celebration dates.';

export function CreatePassword() {
  const navigate = useNavigate();
  const changePassword = useChangePassword();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [mismatch, setMismatch] = useState<string | undefined>(undefined);

  const passed = RULES.filter((rule) => rule.test(password));
  const strengthIndex = password === '' ? 0 : passed.length;
  const allRulesMet = passed.length === RULES.length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmation) {
      setMismatch('Both passwords must match.');
      return;
    }
    setMismatch(undefined);

    const user = getUser();
    if (user === null) {
      // Reached by opening this screen directly, without signing in first.
      setMismatch('Your session has expired. Sign in with your temporary password again.');
      return;
    }

    changePassword.mutate(
      { userId: user.id, password },
      {
        onSuccess: () => {
          void navigate({ to: '/' });
        },
      },
    );
  }

  const requestError =
    changePassword.error === null
      ? undefined
      : changePassword.error instanceof ApiError
        ? (changePassword.error.fieldErrors.password ?? changePassword.error.message)
        : 'Something went wrong. Please try again.';

  return (
    <form className="new-password" onSubmit={handleSubmit}>
      <div className="new-password__progress">
        <p className="new-password__progress-head">
          <span className="new-password__step">Security Setup</span>
          <span className="new-password__step-of">· Step 4 of 4</span>
          <span className="new-password__percent">100% Completed</span>
        </p>
        <span className="new-password__bar" aria-hidden="true">
          {[0, 1, 2, 3].map((segment) => (
            <span key={segment} className="new-password__segment" />
          ))}
        </span>
      </div>

      <header className="new-password__intro">
        <h1 className="new-password__title">Create a new password</h1>
        <p className="new-password__lede">
          Please replace your temporary password with a secure, permanent passphrase to access your
          community workspace.
        </p>
      </header>

      {/*
        Shown as a confirmed, read-only fact rather than an input: the token was
        already verified at sign-in, and there is nothing for the user to change
        here. A dedicated change-password endpoint would re-verify it instead.
      */}
      <div className="new-password__verified">
        <p className="new-password__verified-head">
          <span>Temporary Password</span>
          <span className="new-password__verified-badge">Verified</span>
        </p>
        <p className="new-password__verified-value">
          <IconLock />
          ••••••••••••••••
        </p>
        <p className="new-password__verified-note">
          Issued by group coordinator via SMS verification.
        </p>
      </div>

      <div className="new-password__field">
        <Input
          label="New Secure Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter resilient passphrase"
          autoComplete="new-password"
          minLength={8}
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
        <span className="new-password__strength">Strength: {STRENGTH_LABELS[strengthIndex]}</span>
      </div>

      <span
        className={`new-password__meter new-password__meter--${strengthIndex}`}
        aria-hidden="true"
      />

      <Input
        label="Confirm New Password"
        type={showConfirmation ? 'text' : 'password'}
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder="Re-enter your new passphrase"
        autoComplete="new-password"
        error={mismatch}
        required
        trailing={
          <button
            type="button"
            className="field__toggle"
            onClick={() => setShowConfirmation((value) => !value)}
            aria-label={showConfirmation ? 'Hide password' : 'Show password'}
          >
            {showConfirmation ? <IconEyeOff /> : <IconEye />}
          </button>
        }
      />

      <div className="checklist">
        <p className="checklist__title">Security standards checklist</p>
        <ul className="checklist__list" role="list">
          {RULES.map((rule) => {
            const met = rule.test(password);
            return (
              <li key={rule.id} className={met ? 'checklist__item is-met' : 'checklist__item'}>
                <span className="checklist__marker" aria-hidden="true" />
                {rule.label}
                <span className="visually-hidden">{met ? ' — met' : ' — not met'}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="new-password__advice">
        <span className="new-password__advice-dot" aria-hidden="true" />
        <div>
          <p className="new-password__advice-title">Community Security Advice</p>
          <p className="new-password__advice-text">{ADVICE}</p>
        </div>
      </div>

      {requestError && (
        <p className="new-password__error" role="alert">
          {requestError}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={!allRulesMet || changePassword.isPending}>
        {changePassword.isPending ? 'Saving…' : 'Set New Password & Enter Dashboard'}
        <IconArrowRight />
      </Button>

      <p className="new-password__help">
        Need help? {/* TODO: a real support destination. */}
        <a href="#">
          Contact community administrator
          <IconExternalLink />
        </a>
      </p>
    </form>
  );
}
