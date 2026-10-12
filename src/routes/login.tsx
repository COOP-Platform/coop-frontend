import { createFileRoute, Link } from '@tanstack/react-router';

import authIllustration from '@/assets/COOP_background_img.jpg';
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
      illustrationSrc={authIllustration}
      panelTop={
        <p className="auth-panel__crosslink">
          New to the platform? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
