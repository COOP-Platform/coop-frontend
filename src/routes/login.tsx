import { createFileRoute } from '@tanstack/react-router';

import authIllustration from '@/assets/COOP_background_img.jpg';
import { AuthLayout, LoginForm } from '@/features/auth';

// Top-level route, deliberately NOT nested under `_app` — the sign-in screen
// is full-bleed with no header/nav/footer.
export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthLayout illustrationSrc={authIllustration}>
      <LoginForm />
    </AuthLayout>
  );
}
