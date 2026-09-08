import type { InputHTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  /**
   * Static content inside the control, before the input — e.g. a dial code.
   * Named `leading` rather than `prefix` because `prefix` is a real HTML
   * (RDFa) attribute typed `string`, so it cannot be widened to ReactNode.
   */
  leading?: ReactNode;
  /** Guidance under the field. Replaced by `error` when that is set. */
  hint?: string;
  /** Validation message. Marks the control invalid and takes over from `hint`. */
  error?: string;
}

export function Input({
  label,
  icon,
  trailing,
  leading,
  hint,
  error,
  id,
  className,
  required,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  const controlClasses = ['field__control', error ? 'field__control--invalid' : null, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="field">
      <label htmlFor={inputId} className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={controlClasses}>
        {icon && <span className="field__icon">{icon}</span>}
        {leading && <span className="field__prefix">{leading}</span>}
        <input
          id={inputId}
          className="field__input"
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          {...rest}
        />
        {trailing && <span className="field__trailing">{trailing}</span>}
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
