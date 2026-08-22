import { Link, Outlet } from '@tanstack/react-router';

import { env } from '@/config/env';

/**
 * Application shell: header + navigation, page content, footer.
 * Nav entries are placeholders for the Sprint 1 modules.
 */
export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        {/* TODO(Sprint 0): swap the text brand for the approved logo. */}
        <Link to="/" className="app-header__brand">
          {env.appName}
        </Link>

        <nav className="app-nav">
          <Link to="/" activeProps={{ className: 'is-active' }} activeOptions={{ exact: true }}>
            Home
          </Link>
        </nav>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        Sprint 1 — Community &amp; Member Management · Les Cousins Neretse pilot
      </footer>
    </div>
  );
}
