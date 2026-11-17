import { useEffect, useRef, useState } from 'react';

import {
  Button,
  ErrorState,
  IconCheckCircle,
  IconClose,
  IconPencil,
  LoadingState,
  PageHeader,
  SectionCard,
  SegmentedControl,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useMemberships } from '@/features/members';
import { errorMessage } from '@/lib/api/errors';

import { useCommunity } from '../../api/communities';
import { CommunityCover, CommunityLogo } from './CommunityImages';
import { ImageUpload } from './ImageUpload';
import { PrivacyAccess } from './PrivacyAccess';
import { ProfileForm } from './ProfileForm';
import { ProfileView } from './ProfileView';
import { PROFILE_PERMISSION, SETTINGS_PERMISSION } from './profile';

export type SettingsTab = 'profile' | 'privacy';

const TABS: readonly { value: SettingsTab; label: string }[] = [
  { value: 'profile', label: 'Community profile' },
  { value: 'privacy', label: 'Privacy & access' },
];

interface CommunitySettingsProps {
  tab: SettingsTab;
  /** Edit mode, from `?edit=true` — the dashboard's "finish your profile" lands here. */
  editing: boolean;
  onNavigate: (next: { tab: SettingsTab; editing: boolean }) => void;
}

/**
 * The community's one place to describe and configure itself (S1-09): every
 * member reads it, and members whose position allows it switch the same page
 * into edit mode. The second tab explains who can see and do what (S2-16).
 */
export function CommunitySettings({ tab, editing, onNavigate }: CommunitySettingsProps) {
  const { communityId, can } = useWorkspace();
  const community = useCommunity(communityId);
  const members = useMemberships(communityId, 'active');
  const [saved, setSaved] = useState<string | null>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  const canEditProfile = can(PROFILE_PERMISSION);
  const canEdit = canEditProfile || can(SETTINGS_PERMISSION);
  const isEditing = editing && canEdit && tab === 'profile';

  useEffect(() => {
    if (saved !== null) noticeRef.current?.focus();
  }, [saved]);

  function edit(next: boolean) {
    setSaved(null);
    onNavigate({ tab: 'profile', editing: next });
  }

  let body;
  if (tab === 'privacy') {
    body = <PrivacyAccess />;
  } else if (community.isPending) {
    body = <LoadingState label="Loading the community profile…" />;
  } else if (community.error) {
    body = <ErrorState message={errorMessage(community.error)} />;
  } else if (isEditing) {
    const data = community.data;
    body = (
      <>
        {canEditProfile && (
          <SectionCard title="Logo and cover" footer="Images save on upload.">
            <div className="cs-uploads">
              <ImageUpload communityId={data.id} kind="logo" currentUrl={data.logo_url}>
                <CommunityLogo name={data.name} url={data.logo_url} size="lg" />
              </ImageUpload>
              <ImageUpload communityId={data.id} kind="cover" currentUrl={data.cover_url}>
                <CommunityCover name={data.name} url={data.cover_url} />
              </ImageUpload>
            </div>
          </SectionCard>
        )}
        <section className="card cs-block">
          <ProfileForm
            community={data}
            can={can}
            onCancel={() => edit(false)}
            onSaved={(_, count) => {
              setSaved(count === 0 ? 'Nothing to save.' : 'Profile saved.');
              onNavigate({ tab: 'profile', editing: false });
            }}
          />
        </section>
      </>
    );
  } else {
    body = (
      <ProfileView
        community={community.data}
        memberCount={members.data?.length}
        canEdit={canEdit}
        canEditImages={canEditProfile}
        onEdit={() => edit(true)}
      />
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={isEditing ? 'Edit community profile' : 'Settings'}
        actions={
          tab === 'profile' && canEdit && community.data ? (
            isEditing ? (
              <Button variant="tint" inline icon={<IconClose />} onClick={() => edit(false)}>
                Stop editing
              </Button>
            ) : (
              <Button variant="primary" inline icon={<IconPencil />} onClick={() => edit(true)}>
                Edit profile
              </Button>
            )
          ) : undefined
        }
      />

      {!isEditing && (
        <SegmentedControl
          label="Section"
          options={TABS}
          value={tab}
          onChange={(next) => {
            setSaved(null);
            onNavigate({ tab: next, editing: false });
          }}
        />
      )}

      {saved !== null && tab === 'profile' && !isEditing && (
        <div
          ref={noticeRef}
          tabIndex={-1}
          className="notice notice--success cs-notice"
          role="status"
        >
          <IconCheckCircle />
          <p className="notice__text">{saved}</p>
          <button
            type="button"
            className="cs-notice__close"
            aria-label="Dismiss"
            onClick={() => setSaved(null)}
          >
            <IconClose />
          </button>
        </div>
      )}

      {body}
    </div>
  );
}
