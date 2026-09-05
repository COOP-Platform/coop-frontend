import type { ReactNode } from 'react';

import logoUrl from '@/assets/coop-logo.svg';
import { env } from '@/config/env';

interface AuthLayoutProps {
  children: ReactNode;
  /**
   * Line-art illustration for the brand panel, rendered as a full-bleed
   * background layer at low opacity so the teal shows through it. Left
   * unset until the asset is exported from Figma — the panel just shows
   * solid teal until then.
   */
  illustrationSrc?: string;
}

/**
 * Split-screen shell shared by auth screens (sign in, and later
 * forgot-password / reset-password). Lives in features/auth rather than
 * components/layout because it's specific to this module, not the app shell.
 */
export function AuthLayout({ children, illustrationSrc }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        {illustrationSrc && (
          <div
            className="auth-brand__illustration"
            aria-hidden="true"
            style={{ backgroundImage: `url(${illustrationSrc})` }}
          />
        )}

        <div className="auth-brand__mark">
          <img src={logoUrl} alt={env.appName} className="auth-brand__logo" />
          <span className="auth-brand__name">{env.appName}</span>
        </div>

        <div className="auth-brand__bottom">
          <h1 className="auth-brand__title">A reliable hub for community management</h1>
          <p className="auth-brand__message">
            Manage members, coordinate resources, and keep every community activity transparent —
            all in one place.
          </p>

          <ul className="auth-brand__badges">
            <li>Secure encrypted access</li>
            <li>Community managed</li>
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel__inner">{children}</div>
      </main>
    </div>
  );
}
