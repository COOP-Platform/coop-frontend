import { createFileRoute } from '@tanstack/react-router';

import { env } from '@/config/env';
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

// Hardcoded alongside AppLayout's CURRENT_USER until there is a session to
// read the signed-in member and their community from.
const FIRST_NAME = 'Jean';
const COMMUNITY_NAME = 'Les Cousins';

function DashboardPage() {
  return (
    <div className="dashboard">
      <header className="dashboard__intro">
        <h1 className="dashboard__title">Welcome back, {FIRST_NAME}</h1>
        <p className="dashboard__subtitle">
          Here is an overview of what has been happening within {env.appName} for {COMMUNITY_NAME}.
        </p>
      </header>

      <StatCards stats={STATS} />

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
