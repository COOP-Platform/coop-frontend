import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import {
  Button,
  Checkbox,
  IconArrowRight,
  IconAtSign,
  IconCamera,
  IconImage,
  IconMapPin,
  Input,
  RadioCardGroup,
  Select,
  Textarea,
} from '@/components/ui';
import type { RadioCardOption, SelectOption } from '@/components/ui';
import { env } from '@/config/env';
import { ApiError } from '@/lib/api/client';
import { getUser } from '@/lib/auth/session';
import type { FieldErrors } from '@/lib/api/client';

import { sanitizeSlug, slugify, useCreateCommunity } from '../api/communities';
import type { CommunityType, CreateCommunityRequest } from '../api/communities';

/**
 * Rwanda only for now. The backend stores E.164, but typing `+250788000000`
 * by hand is error-prone, so the dial code is fixed furniture and the user
 * enters just the local part.
 */
const DIAL_CODE = '+250';

const COMMUNITY_TYPES: readonly RadioCardOption[] = [
  { value: 'family', title: 'Family', description: 'Trust & Clan' },
  { value: 'savings_group', title: 'Savings Group', description: 'Savings & Tontine' },
  { value: 'cooperative', title: 'Cooperative', description: 'Agri & Commercial' },
  { value: 'church', title: 'Faith-Based', description: 'Parish & Fellowship' },
  { value: 'ngo', title: 'NGO', description: 'Non-Profit & CBO' },
  { value: 'youth_group', title: 'Youth Guild', description: 'Emerging Talents' },
  { value: 'club', title: 'Club & Sport', description: 'Athletics & Hobby' },
  { value: 'alumni', title: 'Alumni', description: 'School & Cohort' },
];

const CURRENCIES: readonly SelectOption[] = [
  { value: 'RWF', label: 'RWF - Rwandan Franc' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'UGX', label: 'UGX - Ugandan Shilling' },
  { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
];

const LANGUAGES: readonly SelectOption[] = [
  { value: 'en', label: 'English (en)' },
  { value: 'rw', label: 'Kinyarwanda (rw)' },
  { value: 'fr', label: 'Français (fr)' },
  { value: 'sw', label: 'Kiswahili (sw)' },
];

/**
 * Every field this form renders an input for. A 400 naming anything else —
 * `owner`, most likely, while the backend still requires it from the client —
 * has nowhere to appear, so it gets promoted to the form-level banner rather
 * than silently discarded.
 */
const RENDERED_FIELDS = new Set([
  'name',
  'slug',
  'type',
  'description',
  'vision',
  'mission',
  'contact_email',
  'contact_phone',
  'contact_address',
  'logo_url',
  'cover_url',
  'currency',
  'language',
  'founded_year',
]);

const DESCRIPTION_PLACEHOLDER =
  'Briefly describe what unites this community, member guidelines, and regular gatherings…';

const INITIAL_FORM = {
  name: '',
  slug: '',
  type: '',
  description: '',
  vision: '',
  mission: '',
  contactEmail: '',
  contactPhone: '',
  contactAddress: '',
  logoUrl: '',
  coverUrl: '',
  currency: 'RWF',
  language: 'en',
  foundedYear: '',
};

type FormState = typeof INITIAL_FORM;

function SectionHeader({ index, title, badge }: { index: number; title: string; badge: string }) {
  return (
    <div className="form-section__header">
      <h2 className="form-section__title">
        {index}. {title}
      </h2>
      <span className="form-section__badge">{badge}</span>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <section className="form-section">{children}</section>;
}

/** Empty strings are omitted rather than sent as `""`, which the API rejects. */
function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export function CreateCommunityForm() {
  const navigate = useNavigate();
  const createCommunity = useCreateCommunity();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [slugEdited, setSlugEdited] = useState(false);
  const [authorised, setAuthorised] = useState(false);
  // The type cards can't use native `required` (see RadioCardGroup), so the
  // one client-side check we own lives here.
  const [typeError, setTypeError] = useState<string | undefined>(undefined);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  // The slug tracks the name until the user takes it over, so the common case
  // needs no typing and a deliberate edit is never overwritten.
  function handleNameChange(value: string) {
    setForm((previous) => ({
      ...previous,
      name: value,
      slug: slugEdited ? previous.slug : slugify(value),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugEdited(true);
    update('slug', sanitizeSlug(value));
  }

  function buildPayload(): CreateCommunityRequest {
    const localPhone = form.contactPhone.replace(/\D/g, '').replace(/^0+/, '');

    return {
      name: form.name.trim(),
      slug: form.slug.trim().replace(/-+$/, ''),
      type: form.type as CommunityType,
      description: optional(form.description),
      vision: optional(form.vision),
      mission: optional(form.mission),
      contact_email: optional(form.contactEmail),
      contact_phone: localPhone === '' ? undefined : `${DIAL_CODE}${localPhone}`,
      contact_address: optional(form.contactAddress),
      logo_url: optional(form.logoUrl),
      cover_url: optional(form.coverUrl),
      currency: form.currency,
      language: form.language,
      founded_year: form.foundedYear === '' ? undefined : Number(form.foundedYear),
      // Required by the serializer and not derived server-side, so the
      // signed-in user is sent as the founder. Empty when unauthenticated,
      // which the API rejects with a field error rather than failing silently.
      owner: getUser()?.id ?? '',
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.type === '') {
      setTypeError('Choose the type that best describes this community.');
      return;
    }
    setTypeError(undefined);

    createCommunity.mutate(buildPayload(), {
      onSuccess: () => {
        void navigate({ to: '/' });
      },
    });
  }

  // Annotated rather than inferred: the bare `{}` branch would otherwise widen
  // the union and make `fieldErrors.name` a type error.
  const fieldErrors: FieldErrors =
    createCommunity.error instanceof ApiError ? createCommunity.error.fieldErrors : {};

  // Anything the API rejected that has no visible field of its own still has to
  // surface, otherwise the submit button appears to silently stop working.
  let formError: string | undefined;
  if (createCommunity.error instanceof ApiError) {
    const entries = Object.entries(createCommunity.error.fieldErrors);
    const unmapped = entries
      .filter(([key]) => !RENDERED_FIELDS.has(key))
      .map(([key, message]) => `${key}: ${message}`);

    if (unmapped.length > 0) {
      formError = unmapped.join(' · ');
    } else if (entries.length === 0) {
      formError = createCommunity.error.message;
    }
  } else if (createCommunity.error !== null) {
    formError = 'Something went wrong. Please try again.';
  }

  return (
    <form className="community-form" onSubmit={handleSubmit}>
      <header className="community-form__intro">
        <h1 className="community-form__title">Register a community workspace</h1>
        <p className="community-form__subtitle">
          Set up the shared space your members will join. Only the first section is required — the
          rest can be completed later from community settings.
        </p>
      </header>

      <Section>
        <SectionHeader index={1} title="Community Identity" badge="Required" />

        <Input
          label="Community Name"
          value={form.name}
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder="Les Cousins Neretse"
          minLength={2}
          maxLength={120}
          autoComplete="organization"
          error={fieldErrors.name}
          required
        />

        <Input
          label="Community URL"
          value={form.slug}
          onChange={(event) => handleSlugChange(event.target.value)}
          placeholder="les-cousins-neretse"
          leading={<span className="field__prefix-text">/c/</span>}
          maxLength={60}
          hint="Lowercase letters, numbers and hyphens. Must be unique across all communities."
          error={fieldErrors.slug}
          required
        />

        <RadioCardGroup
          legend="Community Type"
          name="community-type"
          options={COMMUNITY_TYPES}
          value={form.type}
          onChange={(value) => {
            setTypeError(undefined);
            update('type', value);
          }}
          error={typeError ?? fieldErrors.type}
          required
        />
      </Section>

      <Section>
        <SectionHeader index={2} title="Narrative & Visual Identity" badge="Optional" />

        <Textarea
          label="Overview & Description"
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          placeholder={DESCRIPTION_PLACEHOLDER}
          rows={4}
          maxLength={2000}
          error={fieldErrors.description}
          counter
        />

        <div className="form-grid form-grid--2">
          <Textarea
            label="Vision Statement"
            value={form.vision}
            onChange={(event) => update('vision', event.target.value)}
            placeholder="The long-term aspiration or legacy…"
            rows={2}
            maxLength={1000}
            error={fieldErrors.vision}
          />
          <Textarea
            label="Mission Statement"
            value={form.mission}
            onChange={(event) => update('mission', event.target.value)}
            placeholder="Daily activities and collective commitments…"
            rows={2}
            maxLength={1000}
            error={fieldErrors.mission}
          />
        </div>

        <div className="form-grid form-grid--2">
          <Input
            label="Crest / Logo Image URL"
            type="url"
            value={form.logoUrl}
            onChange={(event) => update('logoUrl', event.target.value)}
            placeholder="https://example.com/logo.png"
            icon={<IconImage />}
            error={fieldErrors.logo_url}
          />
          <Input
            label="Cover Banner URL"
            type="url"
            value={form.coverUrl}
            onChange={(event) => update('coverUrl', event.target.value)}
            placeholder="https://example.com/banner.jpg"
            icon={<IconCamera />}
            error={fieldErrors.cover_url}
          />
        </div>
      </Section>

      <Section>
        <SectionHeader index={3} title="Contact & Secretariat Details" badge="Regional Settings" />

        <div className="form-grid form-grid--2">
          <Input
            label="Official Secretariat Email"
            type="email"
            value={form.contactEmail}
            onChange={(event) => update('contactEmail', event.target.value)}
            placeholder="secretariat@cousins.org"
            icon={<IconAtSign />}
            autoComplete="email"
            maxLength={255}
            error={fieldErrors.contact_email}
            required
          />
          <Input
            label="Contact Phone (MoMo enabled)"
            type="tel"
            value={form.contactPhone}
            onChange={(event) => update('contactPhone', event.target.value)}
            placeholder="788 000 000"
            inputMode="numeric"
            autoComplete="tel-national"
            leading={
              <span className="field__dial">
                <small>RW</small>
                {DIAL_CODE}
              </span>
            }
            hint="Supports Mobile Money contribution dispatches."
            error={fieldErrors.contact_phone}
            required
          />
        </div>

        <Input
          label="Physical Secretariat / Gathering Address"
          value={form.contactAddress}
          onChange={(event) => update('contactAddress', event.target.value)}
          placeholder="KG 14 Ave, Nyarugenge, Kigali or Family Ancestral Estate"
          icon={<IconMapPin />}
          maxLength={255}
          error={fieldErrors.contact_address}
        />

        <div className="form-grid form-grid--3">
          <Select
            label="Primary Currency"
            options={CURRENCIES}
            value={form.currency}
            onChange={(event) => update('currency', event.target.value)}
            error={fieldErrors.currency}
          />
          <Select
            label="Official Language"
            options={LANGUAGES}
            value={form.language}
            onChange={(event) => update('language', event.target.value)}
            error={fieldErrors.language}
          />
          <Input
            label="Founded Year"
            type="number"
            value={form.foundedYear}
            onChange={(event) => update('foundedYear', event.target.value)}
            placeholder="2024"
            min={1900}
            max={2100}
            error={fieldErrors.founded_year}
          />
        </div>
      </Section>

      <div className="community-form__consent">
        <Checkbox
          label="I am authorized to register this community"
          labelHidden
          checked={authorised}
          onChange={(event) => setAuthorised(event.target.checked)}
          aria-describedby="consent-text"
          required
        />
        <p id="consent-text" className="community-form__consent-text">
          I confirm that I am authorized by the elders, council, or leadership to register this
          community workspace and abide by the{' '}
          {/* TODO: point at the real charter once that page exists. */}
          <a href="#" className="community-form__charter">
            {env.appName} Governance Charter
          </a>
          .
        </p>
      </div>

      {formError && (
        <p className="community-form__error" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={createCommunity.isPending || !authorised}>
        {createCommunity.isPending ? 'Creating workspace…' : 'Create Community Workspace'}
        <IconArrowRight />
      </Button>
    </form>
  );
}
