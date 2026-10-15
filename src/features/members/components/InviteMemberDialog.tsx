import type { FormEvent } from 'react';
import { useState } from 'react';

import { Button, Dialog, IconSend, IconTile, IconUserPlus, Input } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import type { Invitation } from '../api/invitations';
import { useSendInvitation } from '../api/invitations';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Errors {
  full_name?: string;
  email?: string;
  form?: string;
}

/**
 * Invite someone: a name and an email, nothing else. The member category is
 * left to the backend's default ("Standard adult member"); an admin can
 * change it later from the member's details.
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
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problems: Errors = {};
    if (fullName.trim() === '')
      problems.full_name = 'Enter the name of the person you are inviting.';
    if (email.trim() === '')
      problems.email = 'Enter the email address the invitation should go to.';
    else if (!EMAIL_PATTERN.test(email.trim()))
      problems.email = 'Enter a valid email address, like name@example.com.';
    setErrors(problems);
    if (Object.keys(problems).length > 0 || !communityId) return;

    send.mutate(
      { communityId, full_name: fullName.trim(), email: email.trim() },
      {
        onSuccess: onSent,
        onError: (error) => {
          const fields = error instanceof ApiError ? error.fieldErrors : {};
          setErrors({
            full_name: fields.full_name,
            email: fields.email,
            form: fields.full_name || fields.email ? undefined : errorMessage(error),
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
      subtitle="They receive an email with a link to join."
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
