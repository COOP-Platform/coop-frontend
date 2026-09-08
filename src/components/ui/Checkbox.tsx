import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  /**
   * Keeps `label` as the accessible name but hides it visually — for when the
   * visible wording lives in adjacent prose rather than beside the box.
   */
  labelHidden?: boolean;
}

export function Checkbox({ label, labelHidden, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={className ? `checkbox ${className}` : 'checkbox'}>
      <input id={inputId} type="checkbox" className="checkbox__input" {...rest} />
      <label
        htmlFor={inputId}
        className={labelHidden ? 'checkbox__label visually-hidden' : 'checkbox__label'}
      >
        {label}
      </label>
    </div>
  );
}
