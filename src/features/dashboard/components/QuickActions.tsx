import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import {
  IconBarChart,
  IconCalendar,
  IconChevronRight,
  IconPlusCircle,
  IconUserPlus,
  Panel,
} from '@/components/ui';

interface QuickAction {
  label: string;
  icon: ReactNode;
  /** Only present once the destination exists; the rest render disabled. */
  to?: '/members/invite';
}

const ACTIONS: readonly QuickAction[] = [
  { label: 'Add Member', icon: <IconUserPlus />, to: '/members/invite' },
  { label: 'Record Contribution', icon: <IconPlusCircle /> },
  { label: 'Plan Event', icon: <IconCalendar /> },
  { label: 'View Reports', icon: <IconBarChart /> },
];

export function QuickActions() {
  return (
    <Panel title="Quick Actions">
      <ul className="quick-actions" role="list">
        {ACTIONS.map((action) => (
          <li key={action.label}>
            {action.to ? (
              <Link to={action.to} className="quick-action">
                <span className="quick-action__icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="quick-action__label">{action.label}</span>
                <span className="quick-action__chevron" aria-hidden="true">
                  <IconChevronRight />
                </span>
              </Link>
            ) : (
              <button type="button" className="quick-action" disabled>
                <span className="quick-action__icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="quick-action__label">{action.label}</span>
                <span className="quick-action__chevron" aria-hidden="true">
                  <IconChevronRight />
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
