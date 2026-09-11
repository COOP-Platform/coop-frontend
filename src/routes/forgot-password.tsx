import { createFileRoute } from '@tanstack/react-router';

import { AuthLayout, ForgotPasswordForm } from '@/features/auth';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
