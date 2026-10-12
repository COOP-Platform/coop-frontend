/*
 * The create-community wizard's form state, and every rule it checks.
 *
 * The limits mirror `communities.models.Community` and
 * `CommunityCreateSerializer` so a step can be refused before the request
 * rather than after it; the server still has the final say and its errors are
 * routed back to the step that owns the field (`FIELD_STEP`).
 */
import type { SelectOption } from '@/components/ui';

import type { CommunityType, CreateCommunityRequest } from '../../api/communities';

export type StepIndex = 0 | 1 | 2;

export const STEPS = [
  { title: 'Community Basics', short: 'Basics' },
  { title: 'Purpose & Contact', short: 'Purpose' },
  { title: 'Branding & Preferences', short: 'Branding' },
] as const;

export const LIMITS = {
  nameMin: 2,
  name: 120,
  description: 2000,
  vision: 1000,
  mission: 1000,
  email: 255,
  address: 255,
  yearMin: 1900,
} as const;

/** East African dial codes first — the platform's market — then the common others. */
export const DIAL_CODES: readonly SelectOption[] = [
  { value: '+250', label: 'RW +250' },
  { value: '+254', label: 'KE +254' },
  { value: '+256', label: 'UG +256' },
  { value: '+255', label: 'TZ +255' },
  { value: '+257', label: 'BI +257' },
  { value: '+243', label: 'CD +243' },
  { value: '+211', label: 'SS +211' },
  { value: '+251', label: 'ET +251' },
];

export const CURRENCIES: readonly SelectOption[] = [
  { value: 'RWF', label: 'RWF – Rwandan Franc' },
  { value: 'KES', label: 'KES – Kenyan Shilling' },
  { value: 'UGX', label: 'UGX – Ugandan Shilling' },
  { value: 'TZS', label: 'TZS – Tanzanian Shilling' },
  { value: 'BIF', label: 'BIF – Burundian Franc' },
  { value: 'USD', label: 'USD – US Dollar' },
  { value: 'EUR', label: 'EUR – Euro' },
];

export const LANGUAGES: readonly SelectOption[] = [
  { value: 'en', label: 'English (en)' },
  { value: 'rw', label: 'Kinyarwanda (rw)' },
  { value: 'fr', label: 'Français (fr)' },
  { value: 'sw', label: 'Kiswahili (sw)' },
];

export interface WizardForm {
  name: string;
  type: CommunityType | '';
  description: string;
  vision: string;
  mission: string;
  contactEmail: string;
  dialCode: string;
  contactPhone: string;
  contactAddress: string;
  /** The prepared image as a data URL (see images.ts), or empty. Uploaded after the create. */
  logo: string;
  cover: string;
  currency: string;
  language: string;
  foundedYear: string;
}

export const INITIAL_FORM: WizardForm = {
  name: '',
  type: '',
  description: '',
  vision: '',
  mission: '',
  contactEmail: '',
  dialCode: '+250',
  contactPhone: '',
  contactAddress: '',
  logo: '',
  cover: '',
  currency: 'RWF',
  language: 'en',
  foundedYear: '',
};

/** Keyed by API field name, so server and client errors share one shape. */
export type WizardErrors = Partial<Record<keyof CreateCommunityRequest, string>>;

/** Which step renders each API field — where a server error has to be shown. */
export const FIELD_STEP: Record<keyof CreateCommunityRequest, StepIndex> = {
  name: 0,
  type: 0,
  description: 0,
  vision: 1,
  mission: 1,
  contact_email: 1,
  contact_phone: 1,
  contact_address: 1,
  logo_url: 2,
  cover_url: 2,
  currency: 2,
  language: 2,
  founded_year: 2,
};

/** Same pattern as `core.validators.validate_e164_phone`. */
const E164 = /^\+[1-9]\d{7,14}$/;
// Deliberately loose: the server's EmailValidator is the authority, this only
// catches the obvious slip before a round trip.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Local digits only, without a leading trunk 0 — "0788 123 456" -> "788123456". */
function localDigits(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0+/, '');
}

export function fullPhone(form: WizardForm): string | undefined {
  const digits = localDigits(form.contactPhone);
  return digits === '' ? undefined : `${form.dialCode}${digits}`;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function validateStep(step: StepIndex, form: WizardForm): WizardErrors {
  const errors: WizardErrors = {};

  if (step === 0) {
    const name = form.name.trim();
    if (name.length < LIMITS.nameMin) {
      errors.name = `Give the community a name of at least ${LIMITS.nameMin} characters.`;
    } else if (name.length > LIMITS.name) {
      errors.name = `Keep the name under ${LIMITS.name} characters.`;
    }
    if (form.type === '') {
      errors.type = 'Choose the type that best describes this community.';
    }
    if (form.description.length > LIMITS.description) {
      errors.description = `Keep the description under ${LIMITS.description} characters.`;
    }
  }

  if (step === 1) {
    if (form.vision.length > LIMITS.vision) {
      errors.vision = `Keep the vision under ${LIMITS.vision} characters.`;
    }
    if (form.mission.length > LIMITS.mission) {
      errors.mission = `Keep the mission under ${LIMITS.mission} characters.`;
    }
    const email = form.contactEmail.trim();
    if (email !== '' && !EMAIL.test(email)) {
      errors.contact_email = 'Enter a valid email address, e.g. info@yourgroup.rw.';
    }
    const phone = fullPhone(form);
    if (phone !== undefined && !E164.test(phone)) {
      errors.contact_phone = 'Enter the number without the country code, e.g. 788 123 456.';
    }
  }

  if (step === 2) {
    if (form.foundedYear !== '') {
      const year = Number(form.foundedYear);
      if (!Number.isInteger(year) || year < LIMITS.yearMin || year > currentYear()) {
        errors.founded_year = `Enter a year between ${LIMITS.yearMin} and ${currentYear()}.`;
      }
    }
  }

  return errors;
}

/** Empty strings are omitted rather than sent as `""`. */
function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Everything but the images, which go to their own endpoints once the community exists. */
export function buildPayload(form: WizardForm): CreateCommunityRequest {
  return {
    name: form.name.trim(),
    type: form.type as CommunityType,
    description: optional(form.description),
    vision: optional(form.vision),
    mission: optional(form.mission),
    contact_email: optional(form.contactEmail)?.toLowerCase(),
    contact_phone: fullPhone(form),
    contact_address: optional(form.contactAddress),
    currency: form.currency,
    language: form.language,
    founded_year: form.foundedYear === '' ? undefined : Number(form.foundedYear),
  };
}

export function labelFor(options: readonly SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}
