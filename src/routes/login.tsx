import { createFileRoute, Link } from '@tanstack/react-router';

import { AuthLayout, LoginForm, redirectIfSignedIn } from '@/features/auth';

// Top-level route, deliberately NOT nested under `_app` — the sign-in screen
// is full-bleed with no header/nav/footer.
export const Route = createFileRoute('/login')({
  beforeLoad: redirectIfSignedIn,
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout
      footer={
        <>
          Don&apos;t have an account? <Link to="/register">Sign up</Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
