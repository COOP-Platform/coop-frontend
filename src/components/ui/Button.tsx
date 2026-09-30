import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  /** Lavender-tinted and borderless — a quieter action beside a primary one. */
  | 'tint'
  /** Orange — the call to action inside a "needs attention" item. */
  | 'warning'
  /** Destructive, inside a confirmation dialog. */
  | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Size to content instead of filling the row (the auth forms' default). */
  inline?: boolean;
  size?: 'md' | 'sm';
  icon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  inline,
  size = 'md',
  icon,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    inline ? 'btn--inline' : null,
    size === 'sm' ? 'btn--sm' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} {...rest}>
      {icon && (
        <span className="btn__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
