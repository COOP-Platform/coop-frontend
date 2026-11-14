import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { AuthLayout, ChangePasswordForm, requireSession, useMe } from '@/features/auth';
import { clearSession } from '@/lib/auth/session';
import { queryClient } from '@/lib/query-client';

/*
 * Change your password (S1-16), from the top bar's account menu. Also where
 * every other guard sends an account flagged `must_change_password`, which is
 * why this one uses `requireSession`: `requireUser` would send it here again.
 */
export const Route = createFileRoute('/account/password')({
  beforeLoad: async () => {
    await requireSession();
  },
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const navigate = useNavigate();
  const { data: me } = useMe();

  function signOut() {
    clearSession();
    queryClient.clear();
    void navigate({ to: '/login' });
  }

  return (
    <AuthLayout>
      <ChangePasswordForm required={me?.must_change_password === true} onSignOut={signOut} />
    </AuthLayout>
  );
}
