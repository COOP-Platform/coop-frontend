import { createFileRoute } from '@tanstack/react-router';

import { env } from '@/config/env';
import { primaryMembership, useMe } from '@/features/auth';
import { useMemberships } from '@/features/members';
import {
  CONTRIBUTIONS_TREND,
  ContributionsTrend,
  QuickActions,
  RECENT_ACTIONS,
  RecentMemberActions,
  STATS,
  StatCards,
  UPCOMING_EVENTS,
  UpcomingEvents,
} from '@/features/dashboard';

export const Route = createFileRoute('/_app/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: me } = useMe();
  const membership = primaryMembership(me);
  const { data: memberships } = useMemberships(membership?.community.id);

  const firstName = me?.full_name.split(/\s+/)[0] ?? 'there';
  const communityName = membership?.community.name;

  /*
   * Only the member count has an endpoint behind it. Monthly contributions,
   * upcoming events and pending approvals need the finance and meetings apps
   * exposed, or one summary endpoint — until then those three tiles keep the
   * design's figures and are not real.
   */
  const stats = STATS.map((stat) =>
    stat.id === 'members' && memberships !== undefined
      ? {
          ...stat,
          value: String(memberships.length),
          delta: { label: 'live', tone: 'neutral' as const },
        }
      : stat,
  );

  return (
    <div className="dashboard">
      <header className="dashboard__intro">
        <h1 className="dashboard__title">Welcome back, {firstName}</h1>
        <p className="dashboard__subtitle">
          Here is an overview of what has been happening within {env.appName}
          {communityName === undefined ? '' : ` for ${communityName}`}.
        </p>
      </header>

      <StatCards stats={stats} />

      <div className="dashboard__grid">
        <div className="dashboard__col">
          <ContributionsTrend points={CONTRIBUTIONS_TREND} />
          <RecentMemberActions actions={RECENT_ACTIONS} />
        </div>
        <div className="dashboard__col">
          <QuickActions />
          <UpcomingEvents events={UPCOMING_EVENTS} />
        </div>
      </div>
    </div>
  );
}
