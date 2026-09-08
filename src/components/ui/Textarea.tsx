import type { TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  /** Show the "Max N characters" limit under the field. Needs `maxLength`. */
  counter?: boolean;
}

export function Textarea({
  label,
  hint,
  error,
  counter,
  id,
  className,
  required,
  maxLength,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const messageId = `${textareaId}-message`;
  const message = error ?? hint;
  const showCounter = counter === true && maxLength !== undefined;

  const textareaClasses = ['field__textarea', error ? 'field__textarea--invalid' : null, className]
    .filter(Boolean)
    .join(' ');

  const footerClasses = error
    ? 'field__error'
    : ['field__hint', message ? null : 'field__hint--end'].filter(Boolean).join(' ');

  return (
    <div className="field">
      <label htmlFor={textareaId} className="field__label">
        {label}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <textarea
        id={textareaId}
        className={textareaClasses}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={message || showCounter ? messageId : undefined}
        {...rest}
      />

      {(message || showCounter) && (
        <p id={messageId} className={footerClasses} role={error ? 'alert' : undefined}>
          {message ?? `Max ${maxLength?.toLocaleString('en-US')} characters`}
        </p>
      )}
    </div>
  );
}
