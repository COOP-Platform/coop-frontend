import { Outlet } from '@tanstack/react-router';

import { useMe } from '@/features/auth';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Application shell: fixed sidebar, top bar, scrolling content. */
export function AppLayout() {
  const { data: me } = useMe();

  const membership = me?.memberships.find((m) => m.status === 'active') ?? me?.memberships[0];

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <Sidebar communityName={membership?.community.name} />
      </aside>

      <div className="app-shell__body">
        {/*
          Role comes from the membership's contribution category, which is the
          closest thing the schema has to one — real roles land with the RBAC
          app (membership_roles) in Sprint 2.
        */}
        <Topbar userName={me?.full_name ?? '—'} userRole={membership?.member_category.name ?? ''} />

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
