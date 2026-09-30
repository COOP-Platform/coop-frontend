import type { ReactNode } from 'react';

export type IconTileTone = 'brand' | 'info' | 'warning' | 'danger' | 'neutral';

interface IconTileProps {
  children: ReactNode;
  tone?: IconTileTone;
  size?: 'sm' | 'md' | 'lg';
  round?: boolean;
  className?: string;
}

/** A tinted square (or circle) holding an icon — card headers, list rows. */
export function IconTile({
  children,
  tone = 'brand',
  size = 'md',
  round,
  className,
}: IconTileProps) {
  const classes = [
    'icon-tile',
    `icon-tile--${tone}`,
    `icon-tile--${size}`,
    round ? 'icon-tile--round' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden="true">
      {children}
    </span>
  );
}
