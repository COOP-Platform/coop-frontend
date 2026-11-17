import type { FormEvent } from 'react';
import { useState } from 'react';

import { Button, Dialog, IconSend, IconTile, IconUserPlus, Input, Select } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';

import type { Invitation } from '../api/invitations';
import { useSendInvitation } from '../api/invitations';
import { useMemberCategories } from '../api/member-categories';
import { invitationErrorMessage } from './invitationErrors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The category new members join when nobody picks: what the backend defaults to. */
const DEFAULT_CATEGORY = /standard/i;

interface Errors {
  full_name?: string;
  email?: string;
  category?: string;
  form?: string;
}

/**
 * Invite someone: a name, an email and the contribution category they will
 * pay under (S1-11). The category list is the community's own.
 */
export function InviteMemberDialog({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  /** After a successful send — the board opens the new invitation. */
  onSent: (invitation: Invitation) => void;
}) {
  const { communityId } = useWorkspace();
  const send = useSendInvitation();
  const categories = useMemberCategories(communityId);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<Errors>({});

  const activeCategories = (categories.data ?? []).filter((c) => c.is_active);
  // Until someone picks, the backend's own default — so the form is ready to send.
  const categoryId =
    picked ??
    activeCategories.find((c) => DEFAULT_CATEGORY.test(c.name))?.id ??
    activeCategories[0]?.id;
  const chosen = activeCategories.find((c) => c.id === categoryId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
    if (fullName.trim() === '')
      problems.full_name = 'Enter the name of the person you are inviting.';
    if (email.trim() === '')
      problems.email = 'Enter the email address the invitation should go to.';
    else if (!EMAIL_PATTERN.test(email.trim()))
      problems.email = 'Enter a valid email address, like name@example.com.';
    if (activeCategories.length > 0 && categoryId === undefined)
      problems.category = 'Choose the contribution category they will join.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;

    send.mutate(
      {
        communityId,
        full_name: fullName.trim(),
        email: email.trim(),
        category_id: categoryId,
      },
      {
        onSuccess: onSent,
        onError: (error) => {
          const fields = error instanceof ApiError ? error.fieldErrors : {};
          // A refusal about who the person already is reads best as one
          // sentence under the email, where they would correct it.
          setErrors({
            full_name: fields.full_name,
            email: fields.email ? invitationErrorMessage(error) : undefined,
            category: fields.category_id,
            form:
              fields.full_name || fields.email || fields.category_id
                ? undefined
                : invitationErrorMessage(error),
          });
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Invite Member"
      icon={
        <IconTile tone="brand" round>
          <IconUserPlus />
        </IconTile>
      }
    >
      <form className="dialog__form" onSubmit={handleSubmit} noValidate>
        <Input
          label="Full name"
          placeholder="Enter their name"
          autoComplete="off"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          maxLength={120}
          error={errors.full_name}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="Enter their email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={255}
          error={errors.email}
          required
        />
        <Select
          label="Contribution category"
          options={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
          placeholder={
            categories.isPending
              ? 'Loading categories…'
              : activeCategories.length === 0
                ? 'No categories yet — the community default is used'
                : undefined
          }
          value={categoryId ?? ''}
          onChange={(event) => setPicked(event.target.value)}
          disabled={activeCategories.length === 0}
          hint={
            chosen?.description ??
            (categories.isError ? 'Could not load; the default is used.' : undefined)
          }
          error={errors.category}
          required
        />

        {errors.form && <p className="form-error">{errors.form}</p>}

        <div className="dialog__footer dialog__footer--flush">
          <Button variant="tint" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" icon={<IconSend />} disabled={send.isPending}>
            {send.isPending ? 'Sending…' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
