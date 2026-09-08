import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import logoUrl from '@/assets/coop-logo.svg';
import { IconLock, IconShield } from '@/components/ui';
import { env } from '@/config/env';

interface OnboardingLayoutProps {
  children: ReactNode;
}

const BRAND_TAGLINE = 'Les Cousins Family & Savings';

const BRAND_MESSAGE =
  'Manage group savings cycles, mutual assistance funds, and constitutional voting ' +
  'with bank-grade integrity.';

/**
 * Shell for the invitation and first-run screens.
 *
 * Deliberately separate from `AuthLayout` rather than another six optional
 * props on it: this shell's content column carries its own header and footer,
 * which that component has no concept of. The pinned-panel/single-scroller
 * behaviour is the same, so the CSS follows the same shape.
 */
export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="onboarding">
      <aside className="onboarding__brand">
        <div className="onboarding__brand-top">
          <img src={logoUrl} alt="" className="onboarding__logo" />
          <span className="onboarding__brand-names">
            <span className="onboarding__brand-name">{env.appName}</span>
            <span className="onboarding__brand-tagline">{BRAND_TAGLINE}</span>
          </span>
        </div>

        <div className="onboarding__brand-body">
          <span className="onboarding__brand-eyebrow">
            <IconShield />
            Institutional Group Trust
          </span>
          <p className="onboarding__brand-title">
            Empowering collective wealth &amp; transparent solidarity.
          </p>
          <p className="onboarding__brand-message">{BRAND_MESSAGE}</p>
        </div>

        <p className="onboarding__brand-foot">
          <IconLock />
          256-bit encrypted ledger · Compliant community finance
        </p>
      </aside>

      <div className="onboarding__panel">
        <header className="onboarding__topbar">
          <span className="onboarding__gateway">
            <IconShield />
            Secure Onboarding Gateway
          </span>

          <nav className="onboarding__links" aria-label="Account">
            <Link to="/login" className="onboarding__link">
              Sign In
            </Link>
            <Link to="/register" className="onboarding__link">
              Register
            </Link>
            {/* TODO: point at a help page once one exists. */}
            <a href="#" className="onboarding__link onboarding__link--accent">
              Help
            </a>
          </nav>
        </header>

        <main className="onboarding__content">
          <div className="onboarding__inner">{children}</div>
        </main>

        <footer className="onboarding__footer">
          <span>End-to-end encrypted session · {env.appName}</span>
          <span className="onboarding__footer-links">
            {/* TODO: real policy documents. */}
            <a href="#">Privacy Policy</a>
            <a href="#">Group Terms</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
