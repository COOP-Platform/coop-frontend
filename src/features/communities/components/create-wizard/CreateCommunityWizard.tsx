import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { SetupLayout } from '@/components/layout/SetupLayout';
import {
  Button,
  IconArrowLeft,
  IconArrowRight,
  IconCheckCircle,
  IconRocket,
  IconShield,
} from '@/components/ui';
import { selectCommunity } from '@/features/auth';
import { ApiError } from '@/lib/api/client';

import { useFoundCommunity } from '../../api/communities';
import type { CreateCommunityRequest, FoundCommunityResult } from '../../api/communities';
import { CommunityReady } from './CommunityReady';
import { clearDraft, loadDraft, saveDraft } from './draft';
import { dataUrlToBlob } from './images';
import { buildPayload, FIELD_STEP, INITIAL_FORM, STEPS, validateStep } from './model';
import type { StepIndex, WizardErrors, WizardForm } from './model';
import { BasicsStep, BrandingStep, PurposeStep } from './steps';
import type { StepProps } from './steps';
import { WizardStepper } from './WizardStepper';

const STEP_COPY: Record<StepIndex, { eyebrow: string; subtitle: string }> = {
  0: {
    eyebrow: 'Community onboarding',
    subtitle: 'Step 1 of 3: Provide the core details to establish your group.',
  },
  1: {
    eyebrow: 'Constitutional charter',
    subtitle: "Step 2 of 3: Define your community's guiding purpose and official contact channels.",
  },
  2: {
    eyebrow: 'Final step',
    subtitle: 'Step 3 of 3: Add a visual identity and localization preferences, then launch.',
  },
};

/** Which API field a form key feeds — so editing a field clears the server's complaint about it. */
const API_FIELD: Record<keyof WizardForm, keyof CreateCommunityRequest> = {
  name: 'name',
  type: 'type',
  committee: 'with_committee',
  description: 'description',
  vision: 'vision',
  mission: 'mission',
  contactEmail: 'contact_email',
  dialCode: 'contact_phone',
  contactPhone: 'contact_phone',
  contactAddress: 'contact_address',
  logo: 'logo_url',
  cover: 'cover_url',
  currency: 'currency',
  language: 'language',
  foundedYear: 'founded_year',
};

const STEP_BODY: Record<StepIndex, (props: StepProps) => JSX.Element> = {
  0: BasicsStep,
  1: PurposeStep,
  2: BrandingStep,
};

const AUTOSAVE_DELAY_MS = 600;

function isApiField(key: string): key is keyof CreateCommunityRequest {
  return key in FIELD_STEP;
}

/**
 * Founding a community, in three steps and a confirmation.
 *
 * Nothing is sent until the last step: the API creates the community in one
 * request, so the steps are a way of pacing the form, not separate saves.
 * Progress is kept as a local draft instead (see `draft.ts`), which is what
 * "Save Draft" and "Save & Exit" write to.
 */
export function CreateCommunityWizard() {
  const navigate = useNavigate();
  const createCommunity = useFoundCommunity();

  // Read once: the draft seeds the initial state and is not consulted again.
  const [initialDraft] = useState(loadDraft);
  const [form, setForm] = useState<WizardForm>(initialDraft?.form ?? INITIAL_FORM);
  const [step, setStep] = useState<StepIndex>(initialDraft?.step ?? 0);
  // Client-side errors only show for a step once the user has tried to leave it.
  const [attempted, setAttempted] = useState<ReadonlySet<StepIndex>>(new Set());
  const [serverErrors, setServerErrors] = useState<WizardErrors>({});
  const [banner, setBanner] = useState<string | undefined>(undefined);
  const [savedNotice, setSavedNotice] = useState(false);
  const [created, setCreated] = useState<FoundCommunityResult | undefined>(undefined);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const touched = JSON.stringify(form) !== JSON.stringify(INITIAL_FORM);

  // Autosave, so a closed tab or lapsed session costs nothing.
  useEffect(() => {
    if (created !== undefined || !touched) {
      return;
    }
    const timer = window.setTimeout(() => saveDraft(form, step), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [form, step, touched, created]);

  // Each step is a new page as far as the user is concerned: start at its top,
  // and move focus to its heading so screen readers announce the change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }, [step, created]);

  function update<K extends keyof WizardForm>(key: K, value: WizardForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setSavedNotice(false);
    const apiField = API_FIELD[key];
    if (serverErrors[apiField] !== undefined) {
      setServerErrors((previous) => {
        const next = { ...previous };
        delete next[apiField];
        return next;
      });
    }
  }

  function errorsFor(index: StepIndex): WizardErrors {
    const client = attempted.has(index) ? validateStep(index, form) : {};
    const server = Object.fromEntries(
      Object.entries(serverErrors).filter(
        ([field]) => FIELD_STEP[field as keyof WizardErrors] === index,
      ),
    );
    return { ...server, ...client };
  }

  function goTo(next: StepIndex) {
    setBanner(undefined);
    setStep(next);
  }

  function handleSaveDraft() {
    setSavedNotice(saveDraft(form, step));
  }

  function handleSaveAndExit() {
    if (touched) {
      saveDraft(form, step);
    }
    void navigate({ to: '/' });
  }

  async function submit() {
    // Every step, not just this one: a draft restored from an older version
    // of the form could carry a value the earlier steps would now refuse.
    for (const index of [0, 1, 2] as const) {
      if (Object.keys(validateStep(index, form)).length > 0) {
        setAttempted((previous) => new Set(previous).add(index));
        goTo(index);
        return;
      }
    }

    setBanner(undefined);
    const images = {
      logo: form.logo === '' ? undefined : await dataUrlToBlob(form.logo),
      cover: form.cover === '' ? undefined : await dataUrlToBlob(form.cover),
    };
    createCommunity.mutate(
      { community: buildPayload(form), images },
      {
        onSuccess: (result) => {
          clearDraft();
          setCreated(result);
        },
        onError: (error) => {
          if (!(error instanceof ApiError)) {
            setBanner('Something went wrong. Check your connection and try again.');
            return;
          }

          const fieldErrors: WizardErrors = {};
          const unmapped: string[] = [];
          for (const [field, message] of Object.entries(error.fieldErrors)) {
            if (isApiField(field)) {
              fieldErrors[field] = message;
            } else {
              unmapped.push(message);
            }
          }
          setServerErrors(fieldErrors);

          const steps = Object.keys(fieldErrors).map(
            (field) => FIELD_STEP[field as keyof WizardErrors],
          );
          if (steps.length > 0) {
            goTo(Math.min(...steps) as StepIndex);
            setBanner(
              'Some details need another look — the highlighted fields explain what to change.',
            );
          } else {
            setBanner(unmapped[0] ?? error.message);
          }
        },
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < 2) {
      setAttempted((previous) => new Set(previous).add(step));
      if (Object.keys(validateStep(step, form)).length > 0) {
        return;
      }
      goTo((step + 1) as StepIndex);
      return;
    }

    setAttempted((previous) => new Set(previous).add(step));
    void submit();
  }

  if (created !== undefined) {
    return (
      <SetupLayout context="Create Community" center={<StepFourBadge />}>
        <div className="wizard wizard--narrow">
          <CommunityReady
            titleRef={headingRef}
            community={created.community}
            imageErrors={created.imageErrors}
            withCommittee={form.committee === 'yes'}
            onContinue={() => {
              selectCommunity(created.community.id);
              void navigate({ to: '/community' });
            }}
          />
        </div>
      </SetupLayout>
    );
  }

  const errors = errorsFor(step);
  const StepBody = STEP_BODY[step];
  const ownsOne = /already own a community/i.test(banner ?? '');

  return (
    <SetupLayout
      context="Create Community"
      center={
        <button type="button" className="setup__action" onClick={handleSaveAndExit}>
          Save &amp; Exit
        </button>
      }
    >
      <div className="wizard">
        <WizardStepper current={step} onSelect={goTo} />

        <form className="wizard__form" onSubmit={handleSubmit} noValidate>
          <header className="wizard__intro">
            <span className="wizard__eyebrow">
              <IconShield />
              {STEP_COPY[step].eyebrow}
            </span>
            <h1 ref={headingRef} tabIndex={-1} className="wizard__title">
              Create Your Community
            </h1>
            <p className="wizard__subtitle">{STEP_COPY[step].subtitle}</p>
          </header>

          <StepBody form={form} errors={errors} update={update} />

          {banner && (
            <div className="wizard__banner" role="alert">
              <p>{banner}</p>
              {ownsOne && (
                <Link to="/community" className="wizard__banner-link">
                  Go to your community
                </Link>
              )}
            </div>
          )}

          <footer className="wizard__nav">
            {step === 0 ? (
              <Button
                variant="secondary"
                inline
                icon={<IconArrowLeft />}
                onClick={handleSaveAndExit}
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="secondary"
                inline
                icon={<IconArrowLeft />}
                onClick={() => goTo((step - 1) as StepIndex)}
              >
                Back to {STEPS[(step - 1) as 0 | 1].short}
              </Button>
            )}

            <div className="wizard__nav-end">
              {step > 0 && (
                <Button variant="secondary" inline onClick={handleSaveDraft} disabled={!touched}>
                  {savedNotice ? (
                    <>
                      <IconCheckCircle /> Draft saved
                    </>
                  ) : (
                    'Save Draft'
                  )}
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                inline
                disabled={createCommunity.isPending}
                icon={step === 2 ? <IconRocket /> : undefined}
              >
                {step < 2 ? (
                  <>
                    Continue to Step {step + 2}
                    <IconArrowRight />
                  </>
                ) : createCommunity.isPending ? (
                  'Creating community…'
                ) : (
                  'Create Community'
                )}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </SetupLayout>
  );
}

function StepFourBadge() {
  return (
    <span className="setup__done">
      <IconCheckCircle /> Community initialized
    </span>
  );
}
