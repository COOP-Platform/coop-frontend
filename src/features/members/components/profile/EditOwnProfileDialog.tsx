import { useState } from 'react';

import { Button, Dialog, IconTile, IconUserPen, Input } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';

import type { MemberProfile } from '../../api/profile';
import { useUpdateMemberProfile } from '../../api/profile';

/** The member edits their own emergency contact and family relationship. */
export function EditOwnProfileDialog({
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
    <EditOwnProfileForm communityId={communityId} profile={profile} onClose={onClose} />
  ) : null;
}

function EditOwnProfileForm({
  communityId,
  profile,
  onClose,
}: {
  communityId: string;
  profile: MemberProfile;
  onClose: () => void;
}) {
  const update = useUpdateMemberProfile(communityId, profile.id);
  const [contactName, setContactName] = useState(profile.emergency_contact_name ?? '');
  const [contactPhone, setContactPhone] = useState(profile.emergency_contact_phone ?? '');
  const [relationship, setRelationship] = useState(profile.family_relationship ?? '');
  const fieldErrors = update.error instanceof ApiError ? update.error.fieldErrors : {};
  const formError =
    update.error && Object.keys(fieldErrors).length === 0 ? errorMessage(update.error) : null;

  function save() {
    update.mutate(
      {
        emergency_contact_name: contactName.trim(),
        emergency_contact_phone: contactPhone.trim(),
        family_relationship: relationship.trim(),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit my profile"
      subtitle="Who should the community call if something happens to you?"
      icon={
        <IconTile tone="brand" round>
          <IconUserPen />
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
        <Input
          label="Emergency contact name"
          optional
          maxLength={120}
          autoComplete="off"
          value={contactName}
          onChange={(event) => setContactName(event.target.value)}
          error={fieldErrors.emergency_contact_name}
        />
        <Input
          label="Emergency contact phone"
          optional
          type="tel"
          inputMode="tel"
          maxLength={20}
          placeholder="+250788123456"
          hint="Start with the country code, for example +250."
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
          error={fieldErrors.emergency_contact_phone}
        />
        <Input
          label="Family relationship"
          optional
          maxLength={80}
          placeholder="For example: cousin of the founder"
          hint="Mostly used by family communities."
          value={relationship}
          onChange={(event) => setRelationship(event.target.value)}
          error={fieldErrors.family_relationship}
        />
        <p className="table__muted">
          Only you and the people who manage members can see your emergency contact.
        </p>
        {formError && <p className="form-error">{formError}</p>}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
