import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import {
  Button,
  ErrorState,
  IconCommunity,
  IconIdBadge,
  IconMail,
  IconUserCog,
  IconUserPlus,
  LoadingState,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { effectiveStatus, useInvitations, useMemberDirectory } from '@/features/members';
import { usePositions } from '@/features/positions';
import type { Position } from '@/features/positions';
import { errorMessage } from '@/lib/api/errors';
import { isPlainMemberPosition } from '@/lib/position-tone';

import { buildActivity } from '../activity';
import { NeedsAttention } from './NeedsAttention';
import { RemoveVacantDialog } from './RemoveVacantDialog';
import { RecentActivity } from './RecentActivity';

function typeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

export function CommunityDashboard() {
  const navigate = useNavigate();
  const { membership, communityId, can } = useWorkspace();
  const canInvite = can('member.invite');
  const canViewPositions = can('position.view');

  const directory = useMemberDirectory();
  const positions = usePositions(communityId, canViewPositions);
  const invitations = useInvitations(communityId);
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

  return (
    <div className="page">
      <PageHeader
        eyebrow={
          <span className="eyebrow">
            {membership?.community.name} · {typeLabel(membership?.community.type ?? '')}
            <span className="eyebrow__dot" aria-label="Active" />
          </span>
        }
        title="Community"
        subtitle="Manage your community and stay up to date."
        actions={
          <>
            {canInvite && (
              <Button
                variant="tint"
                inline
                icon={<IconUserPlus />}
                onClick={() => void navigate({ to: '/community/invitations/new' })}
              >
                Invite Member
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
          value={members.filter((m) => m.status === 'active').length}
          caption="Active members registered"
          icon={<IconCommunity />}
          tone="brand"
        />
        <StatCard
          label="Active Positions"
          value={canViewPositions ? filledSeats.length : '—'}
          caption={canViewPositions ? 'Assigned leadership roles' : 'Needs position.view'}
          icon={<IconIdBadge />}
          tone="info"
        />
        <StatCard
          label="Pending Invitations"
          value={pending.length}
          caption="Awaiting response"
          icon={<IconMail />}
          tone="warning"
        />
      </div>

      <NeedsAttention
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

      <RemoveVacantDialog
        key={removingVacant === null ? 'closed' : 'open'}
        positions={removingVacant}
        onClose={() => setRemovingVacant(null)}
      />

      <RecentActivity entries={buildActivity(members, invitations.data ?? []).slice(0, 5)} />
    </div>
  );
}
