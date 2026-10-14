import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import logoUrl from '@/assets/coop-logo.svg';
import defaultIllustration from '@/assets/online-community.svg';
import { IconShieldCheck, IconSprout, IconUsers } from '@/components/ui';
import { env } from '@/config/env';

interface AuthLayoutProps {
  children: ReactNode;
  /** Under the form — the "Don't have an account? Sign up" cross-link. */
  footer?: ReactNode;
  /** The brand panel's picture. The panel is hidden below 900px. */
  illustrationSrc?: string;
}

const HIGHLIGHTS = [
  { icon: <IconUsers />, label: 'Stronger communities.' },
  { icon: <IconSprout />, label: 'Better resources.' },
  { icon: <IconShieldCheck />, label: 'Greater transparency.' },
];

function Brand({ className }: { className: string }) {
  return (
    <Link to="/" className={className}>
      <img src={logoUrl} alt="" className="auth-brand-mark__logo" />
      <span className="auth-brand-mark__name">{env.appName}</span>
    </Link>
  );
}

/**
 * Split screen shared by the auth screens (sign in, sign up, forgot and
 * reset password): the brand panel on the left — logo, picture, what COOP is
 * for — and the form on the right. Only the form column scrolls. Below 900px
 * the panel gives way and the logo moves above the form.
 */
export function AuthLayout({
  children,
  footer,
  illustrationSrc = defaultIllustration,
}: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <aside className="auth-art">
        <Brand className="auth-brand-mark auth-brand-mark--art" />

        <div className="auth-art__picture" aria-hidden="true">
          <img src={illustrationSrc} alt="" />
        </div>

        <div className="auth-art__copy">
          {/* Not a heading: the form column carries the page's <h1>. */}
          <p className="auth-art__title">A reliable hub for community management</p>
          <p className="auth-art__message">
            Manage members, coordinate resources, and keep every community activity transparent —
            all in one place.
          </p>
          <ul className="auth-art__highlights" role="list">
            {HIGHLIGHTS.map((item) => (
              <li key={item.label}>
                <span className="auth-art__highlight-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <Brand className="auth-brand-mark auth-brand-mark--panel" />

        <div className="auth-panel__inner">
          {children}
          {footer && <div className="auth-panel__footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
