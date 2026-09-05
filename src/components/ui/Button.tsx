import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
}

export function Button({ children, variant = 'primary', icon, className, ...rest }: ButtonProps) {
  const classes = ['btn', `btn--${variant}`, className].filter(Boolean).join(' ');

  return (
    <button className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
