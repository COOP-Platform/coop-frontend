import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Button,
  ErrorState,
  IconCommunity,
  IconIdBadge,
  IconMail,
  IconPencil,
  IconSprout,
  IconUserCog,
  IconUserPlus,
  LoadingState,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useCommunity } from '@/features/communities';
import {
  PROFILE_PERMISSION,
  missingProfileFields,
} from '@/features/communities/components/settings/profile';
import { effectiveStatus, useInvitations, useMemberDirectory } from '@/features/members';
import { useCommittee, usePositions } from '@/features/positions';
import type { DirectoryMember } from '@/features/members';
import type { Position } from '@/features/positions';
import { errorMessage } from '@/lib/api/errors';
import { isPlainMemberPosition } from '@/lib/position-tone';

import { buildActivity } from '../activity';
import { AppSections } from './AppSections';
import { CommunityOverview } from './CommunityOverview';
import { NeedsAttention } from './NeedsAttention';
import { RemoveVacantDialog } from './RemoveVacantDialog';
import { RecentActivity } from './RecentActivity';

const DAY = 24 * 60 * 60 * 1000;

function joinedAt(member: DirectoryMember): string | null {
  return member.activatedAt ?? member.joinDate;
}

/** Active members at the end of each of the last six months, oldest first. */
function memberTrend(active: readonly DirectoryMember[]): number[] {
  const now = new Date();
  return [5, 4, 3, 2, 1, 0].map((back) => {
    const end = new Date(now.getFullYear(), now.getMonth() - back + 1, 1).getTime();
    return active.filter((m) => {
      const at = joinedAt(m);
      return at !== null && new Date(at).getTime() < end;
    }).length;
  });
}

export function CommunityDashboard() {
  const navigate = useNavigate();
  const { membership, communityId, can } = useWorkspace();
  const canInvite = can('member.invite');
  const canViewPositions = can('position.view');
  const canEditProfile = can(PROFILE_PERMISSION);
  const community = useCommunity(communityId);

  const directory = useMemberDirectory();
  const positions = usePositions(communityId, canViewPositions);
  // Invitations are for those who send them; a member is not shown them.
  const invitations = useInvitations(communityId, canInvite);
  const committee = useCommittee(communityId, !canViewPositions);
  const [removingVacant, setRemovingVacant] = useState<readonly Position[] | null>(null);

  if (directory.isPending) return <LoadingState />;
  if (directory.error) {
    return <ErrorState message={errorMessage(directory.error)} />;
  }

  const members = directory.members;
  const seats = (positions.data ?? []).filter((p) => !isPlainMemberPosition(p.name));
  const filledSeats = seats.filter((p) => p.holder_count > 0);
  const vacantSeats = canViewPositions ? seats.filter((p) => p.holder_count === 0) : [];
  // The admin seat is never offered: deleting the community's only way to be
  // administered is refused by the API anyway.
  const dismissable = vacantSeats.filter((p) => !p.is_admin);
  const pending = (invitations.data ?? []).filter((i) => effectiveStatus(i) === 'pending');
  const active = members.filter((m) => m.status === 'active');
  const activeCount = active.length;
  const monthAgo = Date.now() - 30 * DAY;
  const newCount = active.filter((m) => {
    const at = joinedAt(m);
    return at !== null && new Date(at).getTime() >= monthAgo;
  }).length;
  const incompleteProfile =
    canEditProfile && community.data
      ? missingProfileFields(community.data).map((field) => field.label)
      : [];

  return (
    <div className="page">
      <PageHeader
        title="Community"
        actions={
          <>
            {canInvite && (
              <Button
                variant="tint"
                inline
                icon={<IconUserPlus />}
                onClick={() =>
                  void navigate({ to: '/community/invitations', search: { invite: true } })
                }
              >
                Invite Member
              </Button>
            )}
            {(canEditProfile || can('community.settings.manage')) && (
              <Button
                variant="tint"
                inline
                icon={<IconPencil />}
                onClick={() => void navigate({ to: '/community/settings', search: { edit: true } })}
              >
                Edit Profile
              </Button>
            )}
            {canViewPositions && (
              <Button
                inline
                icon={<IconUserCog />}
                onClick={() => void navigate({ to: '/community/positions' })}
              >
                Manage Roles
              </Button>
            )}
          </>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Members"
          value={activeCount}
          caption="Active"
          icon={<IconCommunity />}
          tone="brand"
          trend={memberTrend(active)}
        />
        <StatCard
          label="Positions"
          value={
            canViewPositions
              ? filledSeats.length
              : (committee.data ?? []).filter((seat) => seat.holders.length > 0).length
          }
          caption="Seats filled"
          icon={<IconIdBadge />}
          tone="info"
        />
        <StatCard
          label="New members"
          value={newCount}
          caption="Last 30 days"
          icon={<IconSprout />}
          tone="accent"
        />
        {canInvite && (
          <StatCard
            label="Invitations"
            value={pending.length}
            caption="Awaiting reply"
            icon={<IconMail />}
            tone="warning"
          />
        )}
      </div>

      <CommunityOverview
        community={community.data}
        fallbackName={membership?.community.name ?? ''}
        fallbackType={membership?.community.type ?? ''}
        membership={membership}
      />

      <div className="dash-row">
        <NeedsAttention
          incompleteProfile={incompleteProfile}
          pendingInvitations={pending}
          vacantSeats={vacantSeats}
          membersWithoutPosition={
            canViewPositions && !directory.positionsPending
              ? members.filter(
                  (m) => m.status === 'active' && m.positionsKnown && m.positions.length === 0,
                )
              : []
          }
          canInvite={canInvite}
          canAssign={can('position.assign')}
          onDismissVacant={
            can('position.delete') && dismissable.length > 0
              ? () => setRemovingVacant(dismissable)
              : undefined
          }
        />

        {/* Recent activity is for whoever manages members, not every member. */}
        {(canInvite || can('member.update') || can('audit.view')) && (
          <RecentActivity
            entries={buildActivity(members, invitations.data ?? [], canInvite).slice(0, 5)}
          />
        )}
      </div>

      <RemoveVacantDialog
        key={removingVacant === null ? 'closed' : 'open'}
        positions={removingVacant}
        onClose={() => setRemovingVacant(null)}
      />

      <AppSections can={can} />
    </div>
  );
}
