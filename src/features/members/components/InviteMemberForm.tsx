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
  Input,
  Select,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { primaryMembership, useMe } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import type { FieldErrors } from '@/lib/api/client';

import { useSendInvitation } from '../api/invitations';
import { useMemberCategories } from '../api/member-categories';

/** Rwanda only, as on the community form — the API stores E.164. */
const DIAL_CODE = '+250';

const PERMISSIONS_BLURB =
  'Member will automatically obtain read access to community financial statements, ' +
  'active event schedules, and voting rights for monthly initiatives.';

export function InviteMemberForm() {
  const { data: me, isPending: mePending } = useMe();
  const membership = primaryMembership(me);
  const communityId = membership?.community.id;

  const { data: categories, isPending: categoriesPending } = useMemberCategories(communityId);
  const sendInvitation = useSendInvitation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [phone, setPhone] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const categoryOptions: readonly SelectOption[] = (categories ?? [])
    .filter((entry) => entry.is_active)
    .map((entry) => ({ value: entry.id, label: entry.name }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (communityId === undefined || membership === undefined) {
      return;
    }

    sendInvitation.mutate(
      {
        community: communityId,
        email: email.trim(),
        full_name: fullName.trim(),
        member_category: category,
        invited_by: membership.id,
      },
      {
        onSuccess: ({ invitation }) => {
          /*
           * Carries the invitation id, not the token: no endpoint resolves a
           * raw token yet (only its hash is stored). The token is still
           * generated and hashed on the way in, so switching this link to
           * `?token=` is all that is needed once verification exists.
           */
          setInviteLink(`${window.location.origin}/invitation?id=${invitation.id}`);
          setFullName('');
          setEmail('');
          setCategory('');
          setPhone('');
        },
      },
    );
  }

  const fieldErrors: FieldErrors =
    sendInvitation.error instanceof ApiError ? sendInvitation.error.fieldErrors : {};

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

  /*
   * An invitation needs a community and an inviting membership, and creating a
   * community does not enrol its owner. So an owner with no membership row
   * genuinely cannot invite anyone, and saying so beats a form that 400s.
   */
  const blocker =
    mePending || categoriesPending
      ? undefined
      : membership === undefined
        ? 'You are not yet a member of any community, so there is no membership to send invitations from. A community owner needs an active membership before inviting others.'
        : categoryOptions.length === 0
          ? 'This community has no contribution categories yet. Every member must be assigned one, so create a category before inviting anyone.'
          : undefined;

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
            <IconUser />
            New Onboarding
          </span>
        </div>

        {blocker !== undefined && (
          <p className="invite-form__blocker" role="status">
            {blocker}
          </p>
        )}

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
          options={categoryOptions}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder={categoriesPending ? 'Loading categories…' : 'Select category'}
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
              hint="Not sent yet — the API has no SMS field or dispatcher."
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

        {inviteLink !== null && (
          <div className="invite-link" role="status">
            <p className="invite-link__title">Invitation created — send this link yourself</p>
            <p className="invite-link__text">
              No email or SMS was dispatched: the API has no mail step. This link is shown once and
              cannot be recovered, because only its hash is stored.
            </p>
            <code className="invite-link__value">{inviteLink}</code>
          </div>
        )}

        {formError && (
          <p className="invite-form__error" role="alert">
            {formError}
          </p>
        )}

        <div className="invite-form__actions">
          <Button
            type="submit"
            variant="primary"
            className="invite-form__submit"
            disabled={sendInvitation.isPending || blocker !== undefined}
          >
            {sendInvitation.isPending ? 'Sending…' : 'Send Invitation'}
            <IconSend />
          </Button>
        </div>
      </form>
    </Card>
  );
}
