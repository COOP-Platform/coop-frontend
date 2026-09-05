import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export function Input({ label, icon, trailing, id, className, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="field">
      <label htmlFor={inputId} className="field__label">
        {label}
      </label>
      <div className={className ? `field__control ${className}` : 'field__control'}>
        {icon && <span className="field__icon">{icon}</span>}
        <input id={inputId} className="field__input" {...rest} />
        {trailing && <span className="field__trailing">{trailing}</span>}
      </div>
    </div>
  );
}
