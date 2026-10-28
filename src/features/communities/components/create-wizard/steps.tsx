import type { ReactNode } from 'react';

import { IconImage, IconUploadCloud, Input, Select, Textarea } from '@/components/ui';
import type { SelectOption } from '@/components/ui';

import { COMMITTEE_OPTIONS, COMMUNITY_TYPES } from './community-types';
import { ImageDrop } from './ImageDrop';
import { COVER_SPEC, LOGO_SPEC } from './images';
import { CURRENCIES, DIAL_CODES, LANGUAGES, LIMITS, currentYear } from './model';
import type { WizardErrors, WizardForm } from './model';

export interface StepProps {
  form: WizardForm;
  errors: WizardErrors;
  update: <K extends keyof WizardForm>(key: K, value: WizardForm[K]) => void;
}

// Plain dropdowns, the same as every other field: the name, then what it means.
const TYPE_OPTIONS: readonly SelectOption[] = COMMUNITY_TYPES.map((type) => ({
  value: type.value,
  label: `${type.title} — ${type.description}`,
}));

const COMMITTEE_SELECT: readonly SelectOption[] = COMMITTEE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.title,
}));

function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="wizard-card">
      {title && (
        <header className="wizard-card__head">
          <span className="wizard-card__heading">
            <h2 className="wizard-card__title">{title}</h2>
            {subtitle && <span className="wizard-card__subtitle">{subtitle}</span>}
          </span>
        </header>
      )}
      <div className="wizard-card__body">{children}</div>
    </section>
  );
}

export function BasicsStep({ form, errors, update }: StepProps) {
  return (
    <Card>
      <Input
        label="Community name"
        value={form.name}
        onChange={(event) => update('name', event.target.value)}
        placeholder="Enter your community's name"
        maxLength={LIMITS.name}
        autoComplete="organization"
        hint={`${LIMITS.nameMin} to ${LIMITS.name} characters.`}
        error={errors.name}
        required
      />

      <Select
        label="Community type"
        placeholder="Select a type"
        options={TYPE_OPTIONS}
        value={form.type}
        onChange={(event) => update('type', event.target.value as WizardForm['type'])}
        error={errors.type}
        required
      />

      <Select
        label="Leadership committee"
        options={COMMITTEE_SELECT}
        value={form.committee}
        onChange={(event) => update('committee', event.target.value as WizardForm['committee'])}
        error={errors.with_committee}
      />

      <Textarea
        label="Description"
        optional
        value={form.description}
        onChange={(event) => update('description', event.target.value)}
        placeholder="What unites this community, who it is for, and what it does together…"
        rows={4}
        maxLength={LIMITS.description}
        error={errors.description}
      />
    </Card>
  );
}

export function PurposeStep({ form, errors, update }: StepProps) {
  return (
    <>
      <Card title="Guiding purpose" subtitle="The long-term commitments of your group.">
        <Textarea
          label="Vision"
          optional
          value={form.vision}
          onChange={(event) => update('vision', event.target.value)}
          placeholder="Where the community wants to be in the long run…"
          rows={3}
          maxLength={LIMITS.vision}
          error={errors.vision}
        />
        <Textarea
          label="Mission"
          optional
          value={form.mission}
          onChange={(event) => update('mission', event.target.value)}
          placeholder="What the community does for its members, day to day…"
          rows={3}
          maxLength={LIMITS.mission}
          error={errors.mission}
        />
      </Card>

      <Card title="Contact details" subtitle="How members and partners reach the community.">
        <Input
          label="Contact email"
          optional
          type="email"
          value={form.contactEmail}
          onChange={(event) => update('contactEmail', event.target.value)}
          placeholder="Enter the community's email"
          autoComplete="email"
          maxLength={LIMITS.email}
          error={errors.contact_email}
        />
        <Input
          label="Contact phone"
          optional
          type="tel"
          value={form.contactPhone}
          onChange={(event) => update('contactPhone', event.target.value)}
          placeholder="788 123 456"
          inputMode="tel"
          autoComplete="tel-national"
          leading={
            <span className="wizard-dial">
              <select
                className="wizard-dial__select"
                aria-label="Country code"
                value={form.dialCode}
                onChange={(event) => update('dialCode', event.target.value)}
              >
                {DIAL_CODES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
          }
          error={errors.contact_phone}
        />
        <Input
          label="Address"
          optional
          value={form.contactAddress}
          onChange={(event) => update('contactAddress', event.target.value)}
          placeholder="e.g. KG 12 Ave, Nyarugenge, Kigali"
          autoComplete="street-address"
          maxLength={LIMITS.address}
          error={errors.contact_address}
        />
      </Card>
    </>
  );
}

export function BrandingStep({ form, errors, update }: StepProps) {
  return (
    <>
      <Card title="Logo and cover" subtitle="Optional. Helps members recognise the community.">
        <div className="wizard-media">
          <ImageDrop
            label="Logo"
            ratio="1:1"
            icon={<IconUploadCloud width={24} height={24} />}
            prompt="or drag and drop"
            hint="PNG, JPG or WebP · max 2 MB"
            browseLabel="Choose file"
            spec={LOGO_SPEC}
            shape="square"
            value={form.logo}
            onChange={(value) => update('logo', value)}
            error={errors.logo_url}
          />
          <ImageDrop
            label="Cover banner"
            ratio="16:9"
            icon={<IconImage width={24} height={24} />}
            prompt="or drag and drop"
            hint="PNG, JPG or WebP · 1200 × 675 px · max 5 MB"
            browseLabel="Choose file"
            spec={COVER_SPEC}
            shape="wide"
            value={form.cover}
            onChange={(value) => update('cover', value)}
            error={errors.cover_url}
          />
        </div>
      </Card>

      <Card title="Preferences">
        <div className="form-grid form-grid--3">
          <Select
            label="Currency"
            options={CURRENCIES}
            value={form.currency}
            onChange={(event) => update('currency', event.target.value)}
            error={errors.currency}
            required
          />
          <Select
            label="Language"
            options={LANGUAGES}
            value={form.language}
            onChange={(event) => update('language', event.target.value)}
            error={errors.language}
            required
          />
          <Input
            label="Founded year"
            optional
            type="number"
            inputMode="numeric"
            value={form.foundedYear}
            onChange={(event) => update('foundedYear', event.target.value)}
            placeholder={String(currentYear())}
            min={LIMITS.yearMin}
            max={currentYear()}
            error={errors.founded_year}
          />
        </div>
      </Card>
    </>
  );
}
