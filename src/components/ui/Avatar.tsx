import type { AvatarTone } from './avatar-utils';
import { initials, toneFor } from './avatar-utils';

interface AvatarProps {
  name: string;
  /** Defaults to a stable tone derived from the name. */
  tone?: AvatarTone;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Rounded square (profile header) rather than a circle. */
  square?: boolean;
  className?: string;
}

export function Avatar({ name, tone, size = 'md', square, className }: AvatarProps) {
  const classes = [
    'avatar',
    `avatar--${size}`,
    `avatar--${tone ?? toneFor(name)}`,
    square ? 'avatar--square' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
