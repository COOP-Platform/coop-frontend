import { createFileRoute, Link } from '@tanstack/react-router';

import authIllustration from '@/assets/COOP_background_img.jpg';
import { IconHeart, IconShield } from '@/components/ui';
import { AuthLayout, redirectIfSignedIn, SignUpForm } from '@/features/auth';

// Top-level route, deliberately NOT nested under `_app` — registration is
// full-bleed with no header/nav/footer, same as /login. It creates the
// account only; founding a community follows on /onboarding.
export const Route = createFileRoute('/register')({
  beforeLoad: redirectIfSignedIn,
  component: RegisterPage,
});

const BRAND_MESSAGE =
  'Manage shared resources, preserve archives, and coordinate upcoming gatherings with ' +
  'complete transparency. Built exclusively for Les Cousins.';

const BADGES = [
  { icon: <IconShield />, label: 'Bank-grade Security' },
  { icon: <IconHeart />, label: 'Family Managed' },
];

function RegisterPage() {
  return (
    <AuthLayout
      illustrationSrc={authIllustration}
      brandTagline="Les Cousins"
      title="A reliable hub for family harmony"
      message={BRAND_MESSAGE}
      badges={BADGES}
      // The form column carries this page's <h1>, so the brand panel must not
      // also be an h1 — it is hidden below 900px.
      brandTitleAs="p"
      panelTop={
        <p className="auth-panel__crosslink">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
