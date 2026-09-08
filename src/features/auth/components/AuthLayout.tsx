import type { ReactNode } from 'react';

import logoUrl from '@/assets/coop-logo.svg';
import { env } from '@/config/env';

export interface AuthBadge {
  icon?: ReactNode;
  label: string;
}

const DEFAULT_TITLE = 'A reliable hub for community management';

const DEFAULT_MESSAGE =
  'Manage members, coordinate resources, and keep every community activity transparent — all in one place.';

const DEFAULT_BADGES: readonly AuthBadge[] = [
  { label: 'Secure encrypted access' },
  { label: 'Community managed' },
];

interface AuthLayoutProps {
  children: ReactNode;
  /**
   * Line-art illustration for the brand panel, rendered as a full-bleed
   * background layer at low opacity so the teal shows through it. Left
   * unset until the asset is exported from Figma — the panel just shows
   * solid teal until then.
   */
  illustrationSrc?: string;
  /** Small caps line under the product name, e.g. the pilot community. */
  brandTagline?: string;
  title?: string;
  message?: string;
  badges?: readonly AuthBadge[];
  /**
   * Rendered between the message and the badges — used for the cross-link
   * between sign-in and registration.
   */
  aside?: ReactNode;
  /**
   * `h1` by default, because sign-in has no other heading. Pages that carry
   * their own visible `<h1>` in the form column should pass `p`: the brand
   * panel is `display: none` under 900px, so leaving the only `h1` in here
   * would strip the page's top-level heading on mobile.
   */
  brandTitleAs?: 'h1' | 'p';
  /** Registration needs a wider form column than sign-in. */
  wide?: boolean;
}

/**
 * Split-screen shell shared by auth screens (sign in, register, and later
 * forgot-password / reset-password). Lives in features/auth rather than
 * components/layout because it's specific to this module, not the app shell.
 */
export function AuthLayout({
  children,
  illustrationSrc,
  brandTagline,
  title = DEFAULT_TITLE,
  message = DEFAULT_MESSAGE,
  badges = DEFAULT_BADGES,
  aside,
  brandTitleAs = 'h1',
  wide,
}: AuthLayoutProps) {
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
          <span className="auth-brand__names">
            <span className="auth-brand__name">{env.appName}</span>
            {brandTagline && <span className="auth-brand__tagline">{brandTagline}</span>}
          </span>
        </div>

        <div className="auth-brand__bottom">
          {brandTitleAs === 'h1' ? (
            <h1 className="auth-brand__title">{title}</h1>
          ) : (
            <p className="auth-brand__title">{title}</p>
          )}
          <p className="auth-brand__message">{message}</p>

          {aside && <div className="auth-brand__aside">{aside}</div>}

          <ul className="auth-brand__badges" role="list">
            {badges.map((badge) => (
              <li key={badge.label}>
                {badge.icon && (
                  <span className="auth-brand__badge-icon" aria-hidden="true">
                    {badge.icon}
                  </span>
                )}
                {badge.label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <div className={wide ? 'auth-panel__inner auth-panel__inner--wide' : 'auth-panel__inner'}>
          {children}
        </div>
      </main>
    </div>
  );
}
