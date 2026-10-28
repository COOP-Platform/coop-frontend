import type { ReactNode } from 'react';
import { useId } from 'react';

import { IconCheckCircle } from './icons';

export interface RadioCardOption {
  value: string;
  title: string;
  /** Second line inside the card — the plain-language gloss on `title`. */
  description: string;
  /** Icon tile above the title. Any option having one switches to the left-aligned layout. */
  icon?: ReactNode;
}

interface RadioCardGroupProps {
  legend: string;
  /** Guidance under the legend. */
  hint?: string;
  /** Right-aligned on the legend row — e.g. "1 type selected". */
  aside?: ReactNode;
  name: string;
  options: readonly RadioCardOption[];
  value: string;
  onChange: (value: string) => void;
  /** Renders the asterisk only — see the note on native validation below. */
  required?: boolean;
  error?: string;
}

/**
 * A grid of selectable cards backed by real radio inputs, so arrow-key
 * navigation and screen-reader grouping come for free. The input is visually
 * hidden rather than removed — it stays focusable, and the visible card reacts
 * via `:checked`/`:focus-visible`.
 *
 * `required` is deliberately NOT forwarded to the inputs. A hidden required
 * radio has nowhere to anchor the browser's validation bubble, so Chrome
 * refuses to submit with "An invalid form control is not focusable" and no
 * visible reason. The caller validates the selection and passes `error`.
 */
export function RadioCardGroup({
  legend,
  hint,
  aside,
  name,
  options,
  value,
  onChange,
  required,
  error,
}: RadioCardGroupProps) {
  const groupId = useId();
  const messageId = `${groupId}-message`;
  const hintId = `${groupId}-hint`;
  const rich = options.some((option) => option.icon !== undefined);
  const describedBy = [hint ? hintId : null, error ? messageId : null].filter(Boolean).join(' ');

  return (
    <fieldset
      className={rich ? 'radio-cards radio-cards--rich' : 'radio-cards'}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
    >
      <legend className="field__label radio-cards__legend">
        {legend}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </legend>

      {(hint || aside) && (
        <div className="radio-cards__meta">
          {hint && (
            <p id={hintId} className="field__hint">
              {hint}
            </p>
          )}
          {aside && <span className="radio-cards__aside">{aside}</span>}
        </div>
      )}

      <div className="radio-cards__grid">
        {options.map((option) => (
          <label key={option.value} className="radio-card">
            <input
              type="radio"
              className="radio-card__input"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className="radio-card__body">
              {option.icon && (
                <span className="radio-card__icon" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              {rich && (
                <span className="radio-card__check" aria-hidden="true">
                  <IconCheckCircle />
                </span>
              )}
              <span className="radio-card__title">{option.title}</span>
              <span className="radio-card__description">{option.description}</span>
            </span>
          </label>
        ))}
      </div>

      {error && (
        <p id={messageId} className="field__error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
