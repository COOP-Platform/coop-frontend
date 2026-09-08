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
}

/**
 * Buttons rather than links: none of these destinations exist yet, and a link
 * to a route that isn't in the generated tree cannot even compile. They are
 * rendered disabled so the affordance is honest instead of dead.
 */
const ACTIONS: readonly QuickAction[] = [
  { label: 'Add Member', icon: <IconUserPlus /> },
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
            <button type="button" className="quick-action" disabled>
              <span className="quick-action__icon" aria-hidden="true">
                {action.icon}
              </span>
              <span className="quick-action__label">{action.label}</span>
              <span className="quick-action__chevron" aria-hidden="true">
                <IconChevronRight />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
