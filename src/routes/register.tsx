import { createFileRoute, Link } from '@tanstack/react-router';

import authIllustration from '@/assets/COOP_background_img.jpg';
import { IconChevronRight, IconHeart, IconLock, IconShield } from '@/components/ui';
import { AuthLayout } from '@/features/auth';
import { CreateCommunityForm } from '@/features/communities';

// Top-level route, deliberately NOT nested under `_app` — registration is
// full-bleed with no header/nav/footer, same as /login.
export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

const BRAND_MESSAGE =
  'Register your cooperative, family trust, or association to manage shared resources, ' +
  'preserve archives, and coordinate initiatives with complete transparency.';

const BADGES = [
  { icon: <IconShield />, label: 'Bank-grade Security' },
  { icon: <IconHeart />, label: 'Family Managed' },
  { icon: <IconLock />, label: 'End-to-End Encrypted' },
];

function RegisterPage() {
  return (
    <AuthLayout
      illustrationSrc={authIllustration}
      brandTagline="Les Cousins"
      title="A reliable hub for family harmony & collective growth"
      message={BRAND_MESSAGE}
      badges={BADGES}
      // The form column carries this page's <h1>, so the brand panel must not
      // also be an h1 — it is hidden below 900px.
      brandTitleAs="p"
      aside={
        <p className="auth-brand__crosslink">
          Already have an active community?
          <Link to="/login" className="btn btn--ghost auth-brand__crosslink-action">
            Sign In to Dashboard
            <IconChevronRight />
          </Link>
        </p>
      }
      wide
    >
      <CreateCommunityForm />
    </AuthLayout>
  );
}
