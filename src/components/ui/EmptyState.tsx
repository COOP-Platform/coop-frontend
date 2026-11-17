import type { ReactNode } from 'react';

import { Illustration } from './Illustration';
import type { IllustrationName } from './Illustration';

interface EmptyStateProps {
  /** Shown instead of an illustration (e.g. a lock when access is denied). */
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  /**
   * Which illustration; by default picked from the title (see `artFor`).
   * `null` shows the icon only.
   */
  art?: IllustrationName | null;
  /** sm inside drawers and small cards. */
  size?: 'sm' | 'md';
}

const NO_ACCESS = /^(you can'?t|you cannot|you don'?t have access|profiles are private)/i;

/** The illustration a title calls for, so callers rarely need to choose. */
function artFor(title: string): IllustrationName | null {
  if (NO_ACCESS.test(title)) return null;
  if (/no match|not found|no longer exists/i.test(title)) return 'search';
  if (/up to date|nothing to review|all caught up/i.test(title)) return 'done';
  if (/announcement|message/i.test(title)) return 'chat';
  if (/invitation/i.test(title)) return 'waiting';
  return 'empty';
}

/**
 * Nothing to show yet: an illustration, a title, and optionally a line and
 * an action. Every empty list, table and section uses it.
 */
export function EmptyState({ icon, title, message, action, art, size = 'md' }: EmptyStateProps) {
  const name = art === undefined ? artFor(title) : art;
  return (
    <div className={`empty-state empty-state--${size}`}>
      {name ? <Illustration name={name} size="sm" className="empty-state__art" /> : icon}
      <p className="empty-state__title">{title}</p>
      {message && <p className="empty-state__message">{message}</p>}
      {action}
    </div>
  );
}
