import {
  Badge,
  ErrorState,
  IconCommunity,
  IconMail,
  IconShieldCheck,
  IconUsers,
  IconAlertTriangle,
  LoadingState,
  StatCard,
} from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';

import { usePlatformHealth } from '../api/platform';
import { PlatformHeader, ReadOnlyNotice } from './PlatformHeader';

const COUNT = new Intl.NumberFormat('en-US');

/** `/platform`: is the service up, and how much is there. Counts only. */
export function PlatformHealthPage() {
  const health = usePlatformHealth();

  return (
    <div className="page">
      <PlatformHeader
        title="System health"
        subtitle="Whether the service is up, and how much it holds. Counts only — nothing here shows what any community has written."
      />

      {health.isPending ? (
        <LoadingState label="Checking the service…" />
      ) : health.isError ? (
        <ErrorState title="Could not check the service" message={errorMessage(health.error)} />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Database"
              value={
                health.data.database === 'ok' ? (
                  <Badge tone="success" dot>
                    Working
                  </Badge>
                ) : (
                  <Badge tone="danger" dot>
                    Not reachable
                  </Badge>
                )
              }
              caption="Checked every minute while this page is open"
              icon={<IconShieldCheck />}
              tone={health.data.database === 'ok' ? 'brand' : 'danger'}
            />
            <StatCard
              label="Communities"
              value={COUNT.format(health.data.communities)}
              caption="Not deleted"
              icon={<IconCommunity />}
              tone="info"
            />
            <StatCard
              label="People"
              value={COUNT.format(health.data.users)}
              caption="Accounts on the platform"
              icon={<IconUsers />}
              tone="info"
            />
            <StatCard
              label="Invitations waiting"
              value={COUNT.format(health.data.pending_invitations)}
              caption="Sent and not yet accepted"
              icon={<IconMail />}
              tone="neutral"
            />
            <StatCard
              label="Invitation emails not sent"
              value={COUNT.format(health.data.invitations_without_email)}
              caption="Waiting invitations whose first email never went out"
              icon={<IconAlertTriangle />}
              tone={health.data.invitations_without_email > 0 ? 'warning' : 'neutral'}
              highlight={health.data.invitations_without_email > 0}
            />
          </div>

          <ReadOnlyNotice />
        </>
      )}
    </div>
  );
}
