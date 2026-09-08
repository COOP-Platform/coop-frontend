import { useId } from 'react';

import { IconBell, IconSearch } from '@/components/ui';

interface TopbarProps {
  userName: string;
  userRole: string;
  /** Unread notifications. The dot is hidden at 0 rather than showing "0". */
  notificationCount?: number;
}

/** First letter of each of the first two words — "Jean Mukiza" -> "JM". */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function Topbar({ userName, userRole, notificationCount = 0 }: TopbarProps) {
  const searchId = useId();

  return (
    <header className="topbar">
      <div className="topbar__search">
        <label htmlFor={searchId} className="visually-hidden">
          Search
        </label>
        <span className="topbar__search-icon" aria-hidden="true">
          <IconSearch />
        </span>
        <input
          id={searchId}
          type="search"
          className="topbar__search-input"
          placeholder="Search members, contributions, events..."
          // TODO: wire to a search endpoint. None exists yet, so the control
          // is disabled rather than accepting input and silently doing nothing.
          title="Search is not available yet"
          disabled
        />
      </div>

      <div className="topbar__actions">
        <button
          type="button"
          className="topbar__bell"
          aria-label={
            notificationCount > 0
              ? `Notifications, ${notificationCount} unread`
              : 'Notifications, none unread'
          }
        >
          <IconBell />
          {notificationCount > 0 && <span className="topbar__badge" aria-hidden="true" />}
        </button>

        <div className="topbar__user">
          <span className="topbar__user-text">
            <span className="topbar__user-name">{userName}</span>
            <span className="topbar__user-role">{userRole}</span>
          </span>
          <span className="topbar__avatar" aria-hidden="true">
            {initials(userName)}
          </span>
        </div>
      </div>
    </header>
  );
}
