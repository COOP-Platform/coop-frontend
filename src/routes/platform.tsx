import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppShell } from '@/components/layout/AppShell';
import { PLATFORM_APP, requirePlatformAdmin } from '@/features/platform';

/*
 * Layout for the Platform Administrator area (#21): every /platform/* page,
 * for platform administrators only — anyone else is sent home. Unlike the
 * community apps it needs no community: most platform administrators have
 * none.
 */
export const Route = createFileRoute('/platform')({
  beforeLoad: requirePlatformAdmin,
  component: PlatformLayout,
});

function PlatformLayout() {
  return (
    <AppShell app={PLATFORM_APP}>
      <Outlet />
    </AppShell>
  );
}
