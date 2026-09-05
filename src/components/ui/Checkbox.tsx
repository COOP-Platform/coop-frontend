import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className ? `checkbox ${className}` : 'checkbox'}>
      <input id={inputId} type="checkbox" className="checkbox__input" {...rest} />
      <label htmlFor={inputId} className="checkbox__label">
        {label}
      </label>
    </div>
  );
}
