import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import logoUrl from '@/assets/coop-logo.svg';
import {
  IconBarChart,
  IconBell,
  IconCalendar,
  IconChat,
  IconCheckSquare,
  IconFile,
  IconHome,
  IconLogout,
  IconUser,
  IconUsers,
  IconWallet,
} from '@/components/ui';
import { env } from '@/config/env';
import { clearSession } from '@/lib/auth/session';

interface NavItem {
  label: string;
  icon: ReactNode;
  /**
   * Present only for routes that exist. TanStack's `Link` is typed against the
   * generated route tree, so an entry for an unbuilt page could not compile —
   * and shipping one as a raw anchor would just 404. Those render as
   * non-interactive items until their screen lands.
   */
  to?: '/';
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', icon: <IconHome />, to: '/' },
  { label: 'Members', icon: <IconUsers /> },
  { label: 'Contributions', icon: <IconWallet /> },
  { label: 'Events & Activities', icon: <IconCalendar /> },
  { label: 'Meetings', icon: <IconChat /> },
  { label: 'Reports', icon: <IconBarChart /> },
  { label: 'Notifications', icon: <IconBell /> },
  { label: 'Documents', icon: <IconFile /> },
  { label: 'Voting', icon: <IconCheckSquare /> },
  { label: 'Profile', icon: <IconUser /> },
];

interface SidebarProps {
  /** From the signed-in user's membership; absent until /auth/me/ resolves. */
  communityName?: string;
}

export function Sidebar({ communityName }: SidebarProps) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    void navigate({ to: '/login' });
  }

  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <img src={logoUrl} alt="" className="sidebar__logo" />
        <span className="sidebar__brand-names">
          <span className="sidebar__brand-name">{env.appName}</span>
          {communityName !== undefined && (
            <span className="sidebar__brand-community">{communityName}</span>
          )}
        </span>
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        <ul className="sidebar__list" role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.label}>
              {item.to ? (
                <Link
                  to={item.to}
                  className="sidebar__item"
                  activeProps={{ className: 'is-active' }}
                  activeOptions={{ exact: true }}
                >
                  <span className="sidebar__item-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ) : (
                <span className="sidebar__item sidebar__item--pending" aria-disabled="true">
                  <span className="sidebar__item-icon">{item.icon}</span>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <button type="button" className="sidebar__item sidebar__logout" onClick={handleLogout}>
          <span className="sidebar__item-icon">
            <IconLogout />
          </span>
          Logout
        </button>
      </div>
    </div>
  );
}
