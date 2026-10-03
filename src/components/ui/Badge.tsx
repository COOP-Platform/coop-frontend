import type { ReactNode } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** A leading status dot — "● Active". */
  dot?: boolean;
  icon?: ReactNode;
  className?: string;
}

/** Small pill for statuses, counts and position labels. */
export function Badge({ children, tone = 'neutral', dot, icon, className }: BadgeProps) {
  const classes = ['badge', `badge--${tone}`, className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {icon && (
        <span className="badge__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}
