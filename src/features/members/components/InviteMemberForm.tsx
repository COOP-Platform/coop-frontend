import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  Card,
  Checkbox,
  IconLayers,
  IconMail,
  IconSend,
  IconShield,
  IconUser,
  IconUserPlus,
  Input,
  Select,
} from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/api/client';

import { useSendInvitation } from '../api/invitations';
import { CONTRIBUTION_CATEGORIES } from '../data/placeholder';

/** Rwanda only, as on the community form — the API stores E.164. */
const DIAL_CODE = '+250';

/**
 * The community an invitation belongs to comes from the inviter's membership,
 * which needs the session. Hardcoded until `/auth/me/` is wired.
 */
const COMMUNITY_ID = '';

const PERMISSIONS_BLURB =
  'Member will automatically obtain read access to community financial statements, ' +
  'active event schedules, and voting rights for monthly initiatives.';

export function InviteMemberForm() {
  const navigate = useNavigate();
  const sendInvitation = useSendInvitation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [phone, setPhone] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    sendInvitation.mutate(
      {
        community: COMMUNITY_ID,
        email: email.trim(),
        full_name: fullName.trim(),
        member_category: category,
      },
      {
        onSuccess: () => {
          void navigate({ to: '/' });
        },
      },
    );
  }

  const fieldErrors: FieldErrors =
    sendInvitation.error instanceof ApiError ? sendInvitation.error.fieldErrors : {};

  // Every field the API rejects that this form has no input for — which today
  // means `token_hash`, `invited_by` and `community`. Surfacing them is the
  // point: the form is otherwise silent about why nothing was sent.
  const rendered = new Set(['email', 'full_name', 'member_category']);
  let formError: string | undefined;
  if (sendInvitation.error instanceof ApiError) {
    const unmapped = Object.entries(sendInvitation.error.fieldErrors)
      .filter(([key]) => !rendered.has(key))
      .map(([key, message]) => `${key}: ${message}`);
    formError =
      unmapped.length > 0
        ? unmapped.join(' · ')
        : Object.keys(sendInvitation.error.fieldErrors).length === 0
          ? sendInvitation.error.message
          : undefined;
  } else if (sendInvitation.error !== null) {
    formError = 'Something went wrong. Please try again.';
  }

  return (
    <Card className="invite-card">
      <form className="invite-form" onSubmit={handleSubmit}>
        <div className="invite-form__header">
          <div className="invite-form__heading">
            <h2 className="invite-form__title">Member Details</h2>
            <p className="invite-form__subtitle">
              Please provide basic credentials to issue a community pass.
            </p>
          </div>
          <span className="invite-form__badge">
            <IconUserPlus />
            New Onboarding
          </span>
        </div>

        <Input
          label="Full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Enter full name"
          icon={<IconUser />}
          autoComplete="name"
          maxLength={120}
          error={fieldErrors.full_name}
          required
        />

        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Enter email address"
          icon={<IconMail />}
          autoComplete="email"
          maxLength={255}
          hint="An invite code and temporary credentials will be dispatched to this inbox."
          error={fieldErrors.email}
          required
        />

        <Select
          label="Contribution category"
          options={CONTRIBUTION_CATEGORIES}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Select category"
          icon={<IconLayers />}
          error={fieldErrors.member_category}
          required
        />

        <div className="invite-sms">
          <div className="invite-sms__header">
            <Checkbox
              label={`Send SMS notification (${DIAL_CODE} Rwanda)`}
              checked={sendSms}
              onChange={(event) => setSendSms(event.target.checked)}
            />
            <span className="invite-sms__badge">Instant SMS</span>
          </div>

          {sendSms && (
            <Input
              label="Mobile number"
              labelHidden
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="078 000 0000"
              inputMode="numeric"
              autoComplete="tel-national"
              leading={<span className="field__prefix-text">{DIAL_CODE}</span>}
            />
          )}
        </div>

        <div className="invite-permissions">
          <span className="invite-permissions__icon" aria-hidden="true">
            <IconShield />
          </span>
          <div>
            <p className="invite-permissions__title">Automatic Permissions</p>
            <p className="invite-permissions__text">{PERMISSIONS_BLURB}</p>
          </div>
        </div>

        {formError && (
          <p className="invite-form__error" role="alert">
            {formError}
          </p>
        )}

        <div className="invite-form__actions">
          <Button
            type="button"
            variant="secondary"
            className="invite-form__cancel"
            onClick={() => void navigate({ to: '/' })}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="invite-form__submit"
            disabled={sendInvitation.isPending}
          >
            {sendInvitation.isPending ? 'Sending…' : 'Send Invitation'}
            <IconSend />
          </Button>
        </div>
      </form>
    </Card>
  );
}
