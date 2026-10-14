import { createFileRoute, Link } from '@tanstack/react-router';

import { AuthLayout, redirectIfSignedIn, SignUpForm } from '@/features/auth';

// Top-level route, deliberately NOT nested under `_app` — registration is
// full-bleed with no header/nav/footer, same as /login. It creates the
// account only; founding a community follows on /onboarding.
export const Route = createFileRoute('/register')({
  beforeLoad: redirectIfSignedIn,
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <AuthLayout
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
