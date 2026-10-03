import { Link, useNavigate } from '@tanstack/react-router';

import { IconLogout, IconSettings } from '@/components/ui';
import type { AppDefinition } from '@/config/apps';
import { clearSession } from '@/lib/auth/session';
import { queryClient } from '@/lib/query-client';

interface SidebarProps {
  app: AppDefinition;
  /** Called after any navigation so the mobile drawer can close. */
  onNavigate?: () => void;
}

/** The selected app's pages. Switching apps (top bar) swaps this list. */
export function Sidebar({ app, onNavigate }: SidebarProps) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    // Drop the previous user's cached /me and lists.
    queryClient.clear();
    void navigate({ to: '/login' });
  }

  return (
    <div className="sidebar">
      <nav className="sidebar__nav" aria-label={app.name}>
        <p className="sidebar__section">{app.name}</p>
        <ul className="sidebar__list" role="list">
          {app.nav.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                className="sidebar__item"
                activeProps={{ className: 'is-active', 'aria-current': 'page' }}
                activeOptions={{ exact: item.exact === true }}
                onClick={onNavigate}
              >
                <span className="sidebar__item-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <Link
          to="/community/settings"
          className="sidebar__item"
          activeProps={{ className: 'is-active', 'aria-current': 'page' }}
          onClick={onNavigate}
        >
          <span className="sidebar__item-icon" aria-hidden="true">
            <IconSettings />
          </span>
          Settings
        </Link>
        <button type="button" className="sidebar__item" onClick={handleLogout}>
          <span className="sidebar__item-icon" aria-hidden="true">
            <IconLogout />
          </span>
          Logout
        </button>
      </div>
    </div>
  );
}
