import { Link, useNavigate } from '@tanstack/react-router';

import {
  Dropdown,
  IconBell,
  IconCheckCircle,
  IconInstitution,
  IconKey,
  IconLogout,
  IconMenu,
  IconUser,
} from '@/components/ui';
import type { AppDefinition } from '@/config/apps';
import { APPS } from '@/config/apps';
import { env } from '@/config/env';
import { selectCommunity, useWorkspace } from '@/features/auth';
import { effectiveStatus, useInvitations } from '@/features/members';
import { NotificationsMenu, useUnreadNotificationCount } from '@/features/notifications';
import { clearSession } from '@/lib/auth/session';
import { formatRelative } from '@/lib/format/date';
import { queryClient } from '@/lib/query-client';

interface TopbarProps {
  app: AppDefinition;
  onMenuClick: () => void;
}

/** "savings_group" -> "Savings group". */
function typeLabel(type: string): string {
  const text = type.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function Topbar({ app, onMenuClick }: TopbarProps) {
  const navigate = useNavigate();
  const { me, memberships, membership, communityId, can, roleLabel } = useWorkspace();
  const canInvite = can('member.invite');
  const invitations = useInvitations(communityId, canInvite);
  const pending = (invitations.data ?? []).filter((i) => effectiveStatus(i) === 'pending');

  // The bell counts unread notifications (polled every minute while the tab
  // is visible). Invitations awaiting an answer are listed under them for
  // those who send invitations, but are not notifications and are not counted.
  const unreadCount = useUnreadNotificationCount(me !== undefined).data ?? 0;
  const suspended = membership?.status === 'suspended';

  function handleLogout() {
    clearSession();
    queryClient.clear();
    void navigate({ to: '/login' });
  }

  const community = membership?.community;

  return (
    <header className="topbar">
      <div className="topbar__start">
        <button
          type="button"
          className="topbar__icon-btn topbar__menu"
          aria-label="Open navigation"
          onClick={onMenuClick}
        >
          <IconMenu />
        </button>

        <Link to={app.to ?? '/community'} className="topbar__brand">
          <span className="topbar__logo" aria-hidden="true">
            <IconInstitution width={22} height={22} />
          </span>
          <span className="topbar__brand-name">{env.appName}</span>
        </Link>

        <span className="topbar__divider" aria-hidden="true" />

        {community && (
          <Dropdown
            label={`Community: ${community.name} (${typeLabel(community.type)}). Switch community`}
            triggerClassName="switcher switcher--community"
            trigger={
              <span className="switcher__text">
                {community.name} ({typeLabel(community.type)})
              </span>
            }
          >
            {(close) => (
              <div className="menu">
                <p className="menu__heading">Your communities</p>
                {memberships.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="menu__item"
                    aria-current={m.community.id === community.id ? 'true' : undefined}
                    onClick={() => {
                      selectCommunity(m.community.id);
                      close();
                      void navigate({ to: app.to ?? '/community' });
                    }}
                  >
                    <span className="menu__item-body">
                      <span className="menu__item-title">{m.community.name}</span>
                      <span className="menu__item-meta">
                        {typeLabel(m.community.type)}
                        {m.positions.length > 0 &&
                          ` · ${m.positions.map((p) => p.name).join(', ')}`}
                        {m.status !== 'active' && ` · ${m.status}`}
                      </span>
                    </span>
                    {m.community.id === community.id && (
                      <span className="menu__check" aria-hidden="true">
                        <IconCheckCircle />
                      </span>
                    )}
                  </button>
                ))}
                <Link to="/onboarding/create" className="menu__footer-link" onClick={close}>
                  Create another community
                </Link>
              </div>
            )}
          </Dropdown>
        )}

        <Dropdown
          label={`App: ${app.name}. Switch app`}
          triggerClassName="switcher switcher--app"
          trigger={
            <>
              <span className="switcher__icon" aria-hidden="true">
                {app.icon}
              </span>
              <span className="switcher__text">{app.name}</span>
            </>
          }
        >
          {(close) => (
            <div className="menu menu--apps">
              <p className="menu__heading">Apps</p>
              {APPS.map((item) =>
                item.to ? (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="menu__item"
                    aria-current={item.id === app.id ? 'true' : undefined}
                    onClick={close}
                  >
                    <span className="menu__app-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="menu__item-body">
                      <span className="menu__item-title">{item.name}</span>
                      <span className="menu__item-meta">{item.description}</span>
                    </span>
                  </Link>
                ) : (
                  <span
                    key={item.id}
                    className="menu__item menu__item--disabled"
                    aria-disabled="true"
                  >
                    <span className="menu__app-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="menu__item-body">
                      <span className="menu__item-title">{item.name}</span>
                      <span className="menu__item-meta">{item.description}</span>
                    </span>
                    <span className="menu__soon">Soon</span>
                  </span>
                ),
              )}
            </div>
          )}
        </Dropdown>
      </div>

      <div className="topbar__end">
        <Dropdown
          chevron={false}
          align="end"
          label={
            unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, none unread'
          }
          triggerClassName="topbar__icon-btn topbar__bell"
          trigger={
            <>
              <IconBell width={22} height={22} />
              {unreadCount > 0 && (
                <span className="topbar__count" aria-hidden="true">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </>
          }
        >
          {(close) => (
            <NotificationsMenu close={close}>
              {suspended && (
                <div className="menu__note notif-menu__extra">
                  <span className="menu__item-title">Your membership is suspended</span>
                  <span className="menu__item-meta">
                    You cannot use this community until an administrator reinstates you.
                  </span>
                </div>
              )}
              {canInvite && pending.length > 0 && (
                <div className="notif-menu__extra">
                  <p className="menu__heading">Invitations awaiting response</p>
                  {pending.slice(0, 3).map((invitation) => (
                    <div key={invitation.id} className="menu__note">
                      <span className="menu__item-title">{invitation.full_name}</span>
                      <span className="menu__item-meta">
                        Invited {formatRelative(invitation.created_at)} · expires{' '}
                        {formatRelative(invitation.expires_at)}
                      </span>
                    </div>
                  ))}
                  <Link
                    to="/community/invitations"
                    className="menu__item notif-menu__inline-link"
                    onClick={close}
                  >
                    View invitations
                  </Link>
                </div>
              )}
            </NotificationsMenu>
          )}
        </Dropdown>

        <span className="topbar__divider" aria-hidden="true" />

        <Dropdown
          chevron={false}
          align="end"
          label={`Account: ${me?.full_name ?? ''}, ${roleLabel}`}
          triggerClassName="topbar__user"
          trigger={
            <>
              <span className="topbar__user-text">
                <span className="topbar__user-name">{me?.full_name ?? '—'}</span>
                <span className="topbar__user-role">{roleLabel}</span>
              </span>
              <span className="topbar__avatar" aria-hidden="true">
                <IconUser />
              </span>
            </>
          }
        >
          {(close) => (
            <div className="menu">
              {me && <p className="menu__heading">{me.email}</p>}
              {membership && (
                <Link
                  to="/community/members"
                  search={{ selected: membership.id }}
                  className="menu__item"
                  onClick={close}
                >
                  <span className="menu__app-icon" aria-hidden="true">
                    <IconUser />
                  </span>
                  <span className="menu__item-title">My profile</span>
                </Link>
              )}
              <Link to="/account/password" className="menu__item" onClick={close}>
                <span className="menu__app-icon" aria-hidden="true">
                  <IconKey />
                </span>
                <span className="menu__item-title">Change password</span>
              </Link>
              <button
                type="button"
                className="menu__item menu__item--danger"
                onClick={handleLogout}
              >
                <span className="menu__app-icon" aria-hidden="true">
                  <IconLogout />
                </span>
                <span className="menu__item-title">Logout</span>
              </button>
            </div>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
