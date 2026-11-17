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
import { PlatformHeader } from './PlatformHeader';

const COUNT = new Intl.NumberFormat('en-US');

/** `/platform`: is the service up, and how much is there. Counts only. */
export function PlatformHealthPage() {
  const health = usePlatformHealth();

  return (
    <div className="page">
      <PlatformHeader title="System health" />

      {health.isPending ? (
        <LoadingState label="Checking the service…" />
      ) : health.isError ? (
        <ErrorState title="Could not check the service" message={errorMessage(health.error)} />
      ) : (
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
            caption="Checked every minute"
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
            caption="Platform accounts"
            icon={<IconUsers />}
            tone="accent"
          />
          <StatCard
            label="Invitations waiting"
            value={COUNT.format(health.data.pending_invitations)}
            caption="Not yet accepted"
            icon={<IconMail />}
            tone="neutral"
          />
          <StatCard
            label="Emails not sent"
            value={COUNT.format(health.data.invitations_without_email)}
            caption="First invitation email"
            icon={<IconAlertTriangle />}
            tone={health.data.invitations_without_email > 0 ? 'warning' : 'neutral'}
            emphasis={health.data.invitations_without_email > 0}
          />
        </div>
      )}
    </div>
  );
}
