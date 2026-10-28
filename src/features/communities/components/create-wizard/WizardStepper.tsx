import { IconCheckCircle } from '@/components/ui';

import { STEPS } from './model';
import type { StepIndex } from './model';

interface WizardStepperProps {
  current: StepIndex;
  /** Lets a finished step be revisited. Steps ahead stay locked until reached. */
  onSelect: (step: StepIndex) => void;
}

export function WizardStepper({ current, onSelect }: WizardStepperProps) {
  return (
    <nav className="wizard-stepper" aria-label="Create community progress">
      <ol className="wizard-stepper__list">
        {STEPS.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'active' : 'upcoming';
          const body = (
            <>
              <span className="wizard-stepper__marker" aria-hidden="true">
                {state === 'done' ? <IconCheckCircle width={22} height={22} /> : index + 1}
              </span>
              <span className="wizard-stepper__text">
                <span className="wizard-stepper__eyebrow">Step {index + 1}</span>
                <span className="wizard-stepper__title">{step.title}</span>
              </span>
            </>
          );

          return (
            <li
              key={step.title}
              className={`wizard-stepper__item wizard-stepper__item--${state}`}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              {state === 'done' ? (
                <button
                  type="button"
                  className="wizard-stepper__button"
                  onClick={() => onSelect(index as StepIndex)}
                  aria-label={`Step ${index + 1}, ${step.title}, completed. Edit`}
                >
                  {body}
                </button>
              ) : (
                <span className="wizard-stepper__button">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
