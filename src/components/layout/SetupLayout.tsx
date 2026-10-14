import { Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import logoUrl from '@/assets/coop-logo.svg';
import { Dropdown, IconLogout, IconUser } from '@/components/ui';
import { env } from '@/config/env';
import { useMe } from '@/features/auth';
import { clearSession } from '@/lib/auth/session';
import { queryClient } from '@/lib/query-client';

interface SetupLayoutProps {
  children: ReactNode;
  /** Small label beside the brand — "Create Community". */
  context?: string;
  /** Centre of the header — the wizard's "Save & Exit". */
  center?: ReactNode;
}

/**
 * Shell for a signed-in user who is not inside a community yet: the
 * onboarding welcome and the create-community wizard. No sidebar — there is
 * nothing to navigate to until a community exists — just the brand, the
 * page's own action, and a way to sign out.
 */
export function SetupLayout({ children, context, center }: SetupLayoutProps) {
  const navigate = useNavigate();
  const { data: me } = useMe();

  function handleSignOut() {
    clearSession();
    queryClient.clear();
    void navigate({ to: '/login' });
  }

  return (
    <div className="setup">
      <header className="setup__bar">
        <div className="setup__start">
          <Link to="/" className="setup__brand">
            <img src={logoUrl} alt="" className="setup__logo" />
            <span className="setup__brand-name">{env.appName}</span>
          </Link>
          {context && (
            <>
              <span className="setup__divider" aria-hidden="true" />
              <span className="setup__context">{context}</span>
            </>
          )}
        </div>

        <div className="setup__center">{center}</div>

        <div className="setup__end">
          <Dropdown
            chevron={false}
            align="end"
            label={`Account: ${me?.full_name ?? ''}`}
            triggerClassName="topbar__user"
            trigger={
              <>
                <span className="topbar__user-text">
                  <span className="topbar__user-name">{me?.full_name ?? '—'}</span>
                  <span className="topbar__user-role">Community Lead</span>
                </span>
                <span className="topbar__avatar" aria-hidden="true">
                  <IconUser />
                </span>
              </>
            }
          >
            {() => (
              <div className="menu">
                {me && <p className="menu__heading">{me.email}</p>}
                <button
                  type="button"
                  className="menu__item menu__item--danger"
                  onClick={handleSignOut}
                >
                  <span className="menu__app-icon" aria-hidden="true">
                    <IconLogout />
                  </span>
                  <span className="menu__item-title">Sign out</span>
                </button>
              </div>
            )}
          </Dropdown>
        </div>
      </header>

      <main className="setup__main">{children}</main>
    </div>
  );
}
