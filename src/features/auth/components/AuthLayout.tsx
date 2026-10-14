import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import logoUrl from '@/assets/coop-logo.svg';
import defaultIllustration from '@/assets/online-community.svg';
import { env } from '@/config/env';

interface AuthLayoutProps {
  children: ReactNode;
  /** Under the form — the "Don't have an account? Sign up" cross-link. */
  footer?: ReactNode;
  /** The art panel's picture. Hidden below 900px, where the form has the whole screen. */
  illustrationSrc?: string;
}

/**
 * Split screen shared by the auth screens (sign in, sign up, forgot and
 * reset password): the brand and a centred form on the left, a quiet picture
 * panel on the right. The form column is the only scroller, so the picture
 * stays put however long the form gets.
 */
export function AuthLayout({
  children,
  footer,
  illustrationSrc = defaultIllustration,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <main className="auth-panel">
        <Link to="/" className="auth-panel__brand">
          <img src={logoUrl} alt="" className="auth-panel__logo" />
          <span className="auth-panel__brand-name">{env.appName}</span>
        </Link>

        <div className="auth-panel__inner">
          {children}
          {footer && <div className="auth-panel__footer">{footer}</div>}
        </div>
      </main>

      <aside className="auth-art" aria-hidden="true">
        <img className="auth-art__image" src={illustrationSrc} alt="" />
      </aside>
    </div>
  );
}
