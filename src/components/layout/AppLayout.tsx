import { Outlet } from '@tanstack/react-router';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Application shell: fixed sidebar, top bar, scrolling content.
 *
 * The signed-in user is hardcoded because there is no session to read it from
 * yet — login discards its token and no route is guarded. It moves to an auth
 * context in Sprint 2.
 */
const CURRENT_USER = {
  name: 'Jean Mukiza',
  role: 'President',
  notificationCount: 3,
};

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <Sidebar />
      </aside>

      <div className="app-shell__body">
        <Topbar
          userName={CURRENT_USER.name}
          userRole={CURRENT_USER.role}
          notificationCount={CURRENT_USER.notificationCount}
        />

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
