import { useId } from 'react';

export interface RadioCardOption {
  value: string;
  title: string;
  /** Second line inside the card — the plain-language gloss on `title`. */
  description: string;
}

interface RadioCardGroupProps {
  legend: string;
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
  name,
  options,
  value,
  onChange,
  required,
  error,
}: RadioCardGroupProps) {
  const groupId = useId();
  const messageId = `${groupId}-message`;

  return (
    <fieldset
      className="radio-cards"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? messageId : undefined}
    >
      <legend className="field__label">
        {legend}
        {required && (
          <span className="field__required" aria-hidden="true">
            *
          </span>
        )}
      </legend>

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
