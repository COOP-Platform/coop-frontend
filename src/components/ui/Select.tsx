import type { SelectHTMLAttributes } from 'react';
import { useId } from 'react';

import { IconChevronDown } from './icons';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
  /** Rendered as a disabled first option, for when there is no sensible default. */
  placeholder?: string;
  hint?: string;
  error?: string;
}

export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  id,
  className,
  required,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const messageId = `${selectId}-message`;
  const message = error ?? hint;

  const controlClasses = [
    'field__control',
    'field__control--select',
    error ? 'field__control--invalid' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <label htmlFor={selectId} className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={controlClasses}>
        <select
          id={selectId}
          className="field__select"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="field__chevron" aria-hidden="true">
          <IconChevronDown />
        </span>
      </div>

      {message && (
        <p
          id={messageId}
          className={error ? 'field__error' : 'field__hint'}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}
