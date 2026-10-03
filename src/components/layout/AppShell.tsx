import type { ReactNode } from 'react';
import { useState } from 'react';

import type { AppDefinition } from '@/config/apps';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  app: AppDefinition;
  children: ReactNode;
}

/**
 * Top bar across the full width, the selected app's sidebar below it, and a
 * scrolling content column. Under 1024px the sidebar becomes a drawer opened
 * from the top bar's menu button.
 */
export function AppShell({ app, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="shell">
      <Topbar app={app} onMenuClick={() => setDrawerOpen(true)} />

      <div className="shell__body">
        <aside className={drawerOpen ? 'shell__sidebar is-open' : 'shell__sidebar'}>
          <Sidebar app={app} onNavigate={() => setDrawerOpen(false)} />
        </aside>
        {drawerOpen && (
          <button
            type="button"
            className="shell__scrim"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        <main className="shell__main">
          <div className="shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}
