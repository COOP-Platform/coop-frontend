import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { AuthLayout, ResetPasswordForm } from '@/features/auth';
import { readTokenFromHash } from '@/lib/url/hash-token';

// The backend emails `{FRONTEND_URL}/reset-password#token=…`
// (accounts/services.py), so this path and the fragment are fixed by it.
export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [token] = useState(readTokenFromHash);

  return (
    <AuthLayout>
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
