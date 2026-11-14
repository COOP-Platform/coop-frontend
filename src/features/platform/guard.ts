import { redirect } from '@tanstack/react-router';

import { requireUser } from '@/features/auth';

/**
 * For `/platform/*`: Platform Administrators only. Anyone else is sent home,
 * where the usual rules pick the Community app or onboarding. The API
 * refuses them regardless; this only spares them a page of refusals.
 */
export async function requirePlatformAdmin(): Promise<void> {
  const me = await requireUser();
  if (!me.is_platform_admin) {
    throw redirect({ to: '/' });
  }
}
