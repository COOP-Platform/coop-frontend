import { useState } from 'react';

import { Button, Dialog, IconTile, IconUserCog, Select, Textarea } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import { useMemberCategories } from '../../api/member-categories';
import type { ManagedProfileInput, MemberProfile } from '../../api/profile';
import { useUpdateMemberProfile } from '../../api/profile';

/**
 * Someone who manages members changes a member's category, status or notes.
 * Each part shows only with its permission: category and notes need
 * `member.update`, status `member.suspend`. Removal stays on its own button.
 */
export function ManageMembershipDialog({
  communityId,
  profile,
  open,
  onClose,
}: {
  communityId: string;
  profile: MemberProfile;
  open: boolean;
  onClose: () => void;
}) {
  return open ? (
    <ManageMembershipForm communityId={communityId} profile={profile} onClose={onClose} />
  ) : null;
}

function ManageMembershipForm({
  communityId,
  profile,
  onClose,
}: {
  communityId: string;
  profile: MemberProfile;
  onClose: () => void;
}) {
  const { can } = useWorkspace();
  const categories = useMemberCategories(communityId);
  const update = useUpdateMemberProfile(communityId, profile.id);
  const [category, setCategory] = useState(profile.member_category.id);
  const [status, setStatus] = useState(profile.status);
  const [notes, setNotes] = useState(profile.notes ?? '');

  const canUpdate = can('member.update');
  const canStatus =
    can('member.suspend') && (profile.status === 'active' || profile.status === 'suspended');
  const fieldErrors = update.error instanceof ApiError ? update.error.fieldErrors : {};
  const formError =
    update.error && Object.keys(fieldErrors).length === 0 ? errorMessage(update.error) : null;

  const categoryOptions = (categories.data ?? [])
    .filter((c) => c.is_active || c.id === profile.member_category.id)
    .map((c) => ({ value: c.id, label: c.is_active ? c.name : `${c.name} (retired)` }));

  function save() {
    const input: ManagedProfileInput = {};
    if (canUpdate && category !== profile.member_category.id) input.member_category = category;
    if (canUpdate && notes.trim() !== (profile.notes ?? '')) input.notes = notes.trim();
    if (canStatus && status !== profile.status && (status === 'active' || status === 'suspended')) {
      input.status = status;
    }
    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    update.mutate(input, { onSuccess: onClose });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit membership"
      icon={
        <IconTile tone="brand" round>
          <IconUserCog />
        </IconTile>
      }
      footer={
        <>
          <Button variant="tint" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={update.isPending} onClick={save}>
            {update.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="profile-form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        {canUpdate && (
          <Select
            label="Contribution category"
            options={categoryOptions}
            value={category}
            disabled={categories.isPending}
            onChange={(event) => setCategory(event.target.value)}
            hint={
              categories.error ? errorMessage(categories.error) : 'Sets what they owe each month.'
            }
            error={fieldErrors.member_category}
          />
        )}
        {canStatus && (
          <Select
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ]}
            value={status}
            onChange={(event) => setStatus(event.target.value as MemberProfile['status'])}
            hint="Keeps positions; can do nothing until active."
            error={fieldErrors.status}
          />
        )}
        {canUpdate && (
          <Textarea
            label="Notes"
            optional
            maxLength={1000}
            counter
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            hint="Only member managers see these."
            error={fieldErrors.notes}
          />
        )}
        {formError && <p className="form-error">{formError}</p>}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
