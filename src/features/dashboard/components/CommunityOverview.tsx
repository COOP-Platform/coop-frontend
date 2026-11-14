import { Link } from '@tanstack/react-router';

import { Badge, IconArrowRight, IconShieldCheck } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import type { MembershipSummary } from '@/features/auth';
import type { Community } from '@/features/communities';
import { CommunityLogo } from '@/features/communities/components/settings/CommunityImages';
import { communityTypeLabel } from '@/features/communities/components/create-wizard/community-types';
import { formatDate } from '@/lib/format/date';

const MEMBERSHIP_STATUS: Record<MembershipSummary['status'], { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  invited: { label: 'Invited', tone: 'info' },
  suspended: { label: 'Suspended', tone: 'warning' },
  removed: { label: 'Removed', tone: 'neutral' },
};

interface CommunityOverviewProps {
  community: Community | undefined;
  /** From /me, shown while the community itself loads. */
  fallbackName: string;
  fallbackType: string;
  memberCount: number;
  membership: MembershipSummary | undefined;
  canEdit: boolean;
}

/**
 * Who the community is and where the signed-in member stands in it — the
 * same for every member; only the prompt to describe the community is for
 * those who may edit it.
 */
export function CommunityOverview({
  community,
  fallbackName,
  fallbackType,
  memberCount,
  membership,
  canEdit,
}: CommunityOverviewProps) {
  const name = community?.name ?? fallbackName;
  const status = membership ? MEMBERSHIP_STATUS[membership.status] : undefined;
  const positions = membership?.positions.map((p) => p.name) ?? [];

  return (
    <div className="dash-overview">
      <section className="card dash-identity" aria-labelledby="dash-identity-name">
        <div className="dash-identity__head">
          <CommunityLogo name={name} url={community?.logo_url} />
          <div className="dash-identity__text">
            <h2 id="dash-identity-name" className="dash-identity__name">
              {name}
            </h2>
            <p className="dash-identity__meta">
              {communityTypeLabel(community?.type ?? fallbackType)} · {memberCount} active{' '}
              {memberCount === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>
        {community?.description ? (
          <p className="dash-identity__description">{community.description}</p>
        ) : (
          <p className="dash-identity__description dash-muted">
            {canEdit
              ? 'No description yet. Tell members who you are and what brings you together.'
              : 'This community has not added a description yet.'}
          </p>
        )}
        <div className="dash-links">
          <Link to="/community/settings" className="dash-link">
            Community profile
            <IconArrowRight />
          </Link>
          <Link to="/community/settings" search={{ tab: 'privacy' }} className="dash-link">
            <IconShieldCheck />
            Privacy &amp; access
          </Link>
        </div>
      </section>

      <section className="card dash-me" aria-labelledby="dash-me-title">
        <h2 id="dash-me-title" className="dash-me__title">
          Your membership
        </h2>
        <dl className="dash-me__facts">
          <div className="dash-me__fact">
            <dt>Status</dt>
            <dd>{status ? <Badge tone={status.tone}>{status.label}</Badge> : '—'}</dd>
          </div>
          <div className="dash-me__fact">
            <dt>Contribution category</dt>
            <dd>{membership?.member_category.name ?? '—'}</dd>
          </div>
          <div className="dash-me__fact">
            <dt>Positions</dt>
            <dd>{positions.length > 0 ? positions.join(', ') : 'Member'}</dd>
          </div>
          {membership?.join_date && (
            <div className="dash-me__fact">
              <dt>Member since</dt>
              <dd>{formatDate(membership.join_date)}</dd>
            </div>
          )}
        </dl>
      </section>
    </div>
  );
}
