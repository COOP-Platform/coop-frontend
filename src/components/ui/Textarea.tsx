import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  /** Adds a muted "(Optional)" after the label. */
  optional?: boolean;
  /** Right-aligned note on the label row — "Required", "0 / 200". */
  aside?: ReactNode;
  hint?: string;
  error?: string;
  /** Show the "Max N characters" limit under the field. Needs `maxLength`. */
  counter?: boolean;
}

export function Textarea({
  label,
  optional,
  aside,
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

  const labelElement = (
    <label htmlFor={textareaId} className="field__label">
      {label}
      {optional && <span className="field__optional">(Optional)</span>}
      {required && (
        <span className="field__required" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );

  return (
    <div className="field">
      {aside ? (
        <div className="field__label-row">
          {labelElement}
          <span className="field__aside">{aside}</span>
        </div>
      ) : (
        labelElement
      )}

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
