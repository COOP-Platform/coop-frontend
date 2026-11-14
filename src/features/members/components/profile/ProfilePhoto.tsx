import { useRef, useState } from 'react';

import { Avatar, Button, IconCamera, IconTrash } from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';

import type { MemberProfile } from '../../api/profile';
import {
  MAX_PHOTO_BYTES,
  PHOTO_TYPES,
  photoErrorMessage,
  useRemoveMemberPhoto,
  useUploadMemberPhoto,
} from '../../api/profile';

/**
 * The member's photo, or their initials when there is none. The member (and
 * anyone with `member.update`) can add, replace or remove it.
 */
export function ProfilePhoto({
  communityId,
  name,
  profile,
}: {
  communityId: string;
  name: string;
  profile: MemberProfile | undefined;
}) {
  const [broken, setBroken] = useState(false);
  const url = profile?.photo_url && !broken ? profile.photo_url : null;

  return (
    <div className="profile-photo">
      {url ? (
        <img
          className="profile-photo__image"
          src={url}
          alt={`Photo of ${name}`}
          onError={() => setBroken(true)}
        />
      ) : (
        <Avatar name={name} tone="brand" size="lg" square />
      )}
      {profile?.can_change_photo && (
        <PhotoControls
          communityId={communityId}
          profile={profile}
          hasPhoto={profile.photo_url !== null}
          onUploaded={() => setBroken(false)}
        />
      )}
    </div>
  );
}

function PhotoControls({
  communityId,
  profile,
  hasPhoto,
  onUploaded,
}: {
  communityId: string;
  profile: MemberProfile;
  hasPhoto: boolean;
  onUploaded: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const upload = useUploadMemberPhoto(communityId, profile.id);
  const remove = useRemoveMemberPhoto(communityId, profile.id);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = upload.isPending || remove.isPending;
  const failure = upload.error ?? remove.error;
  const message =
    localError ?? (failure ? (photoErrorMessage(failure) ?? errorMessage(failure)) : null);

  function choose(file: File | undefined) {
    setLocalError(null);
    upload.reset();
    remove.reset();
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      setLocalError('Choose a JPEG, PNG or WebP picture.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setLocalError('That picture is larger than 5 MB. Choose a smaller one.');
      return;
    }
    upload.mutate(file, { onSuccess: onUploaded });
  }

  return (
    <div className="profile-photo__controls">
      <input
        ref={input}
        type="file"
        accept={PHOTO_TYPES.join(',')}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          choose(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <Button
        size="sm"
        variant="tint"
        inline
        icon={<IconCamera />}
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {upload.isPending ? 'Uploading…' : hasPhoto ? 'Change photo' : 'Add photo'}
      </Button>
      {hasPhoto && (
        <Button
          size="sm"
          variant="tint"
          inline
          icon={<IconTrash />}
          disabled={busy}
          onClick={() => {
            setLocalError(null);
            remove.mutate(undefined);
          }}
        >
          {remove.isPending ? 'Removing…' : 'Remove'}
        </Button>
      )}
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
