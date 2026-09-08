import { Panel } from '@/components/ui';

import type { MemberAction } from '../data/placeholder';

interface RecentMemberActionsProps {
  actions: readonly MemberAction[];
}

export function RecentMemberActions({ actions }: RecentMemberActionsProps) {
  return (
    <Panel title="Recent Member Actions">
      <ul className="feed" role="list">
        {actions.map((action) => (
          <li key={action.id} className="feed__item">
            <p className="feed__line">
              <span className="feed__actor">{action.actor}</span> {action.action}
              {action.highlight && <span className="feed__highlight"> {action.highlight}</span>}
            </p>
            <p className="feed__meta">
              {action.timeAgo} · {action.context}
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
