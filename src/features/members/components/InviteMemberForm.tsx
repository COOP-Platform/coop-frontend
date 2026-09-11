import { useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  Card,
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

const PERMISSIONS_BLURB =
  'The member gets read access to community financial statements, active event schedules, ' +
  'and voting rights for monthly initiatives.';

export function InviteMemberForm() {
  const { data: me } = useMe();
  const membership = primaryMembership(me);
  const communityId = membership?.community.id;

  const { data: categories, isPending: categoriesPending } = useMemberCategories(communityId);
  const sendInvitation = useSendInvitation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);

  const categoryOptions: readonly SelectOption[] = (categories ?? [])
    .filter((entry) => entry.is_active)
    .map((entry) => ({ value: entry.id, label: entry.name }));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (communityId === undefined) {
      return;
    }

    const recipient = email.trim();

    sendInvitation.mutate(
      {
        communityId,
        full_name: fullName.trim(),
        email: recipient,
        category_id: category,
      },
      {
        onSuccess: (invitation) => {
          // The server emails the link. Report whether that leg actually went
          // out rather than assuming it did — a null timestamp means it didn't.
          setSentTo(invitation.invitation_email_sent_at === null ? '' : recipient);
          setFullName('');
          setEmail('');
          setCategory('');
        },
      },
    );
  }

  const fieldErrors: FieldErrors =
    sendInvitation.error instanceof ApiError ? sendInvitation.error.fieldErrors : {};

  const rendered = new Set(['email', 'full_name', 'category_id']);
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

  // Creating a community now seeds categories, so an empty list means
  // something unusual — say so rather than offering an empty dropdown.
  const noCategories = !categoriesPending && categoryOptions.length === 0;

  return (
    <Card className="invite-card">
      <form className="invite-form" onSubmit={handleSubmit}>
        <div className="invite-form__header">
          <div className="invite-form__heading">
            <h2 className="invite-form__title">Member Details</h2>
            <p className="invite-form__subtitle">
              We email them a private link. They choose their own password when they accept.
            </p>
          </div>
          <span className="invite-form__badge">
            <IconUser />
            New Onboarding
          </span>
        </div>

        {noCategories && (
          <p className="invite-form__blocker" role="status">
            This community has no contribution categories, so there is nothing to assign a member
            to. Categories are normally created with the community — ask an administrator to add
            one.
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
          hint="The invitation link is sent here. It is valid for 14 days."
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
          error={fieldErrors.category_id}
          required
        />

        <div className="invite-permissions">
          <span className="invite-permissions__icon" aria-hidden="true">
            <IconShield />
          </span>
          <div>
            <p className="invite-permissions__title">Automatic Permissions</p>
            <p className="invite-permissions__text">{PERMISSIONS_BLURB}</p>
          </div>
        </div>

        {sentTo !== null && (
          <div className="invite-link" role="status">
            {sentTo === '' ? (
              <>
                <p className="invite-link__title">
                  Invitation created, but the email didn&apos;t send
                </p>
                <p className="invite-link__text">
                  The invitation is in the list below. Use Resend to try the email again.
                </p>
              </>
            ) : (
              <>
                <p className="invite-link__title">Invitation sent to {sentTo}</p>
                <p className="invite-link__text">
                  They have a private link valid for 14 days. You can resend or withdraw it from the
                  list beside this form.
                </p>
              </>
            )}
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
            disabled={sendInvitation.isPending || noCategories || communityId === undefined}
          >
            {sendInvitation.isPending ? 'Sending…' : 'Send Invitation'}
            <IconSend />
          </Button>
        </div>
      </form>
    </Card>
  );
}
