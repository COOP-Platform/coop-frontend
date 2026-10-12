import type { ReactNode } from 'react';

import {
  IconAtSign,
  IconCalendar,
  IconCommunity,
  IconFlag,
  IconImage,
  IconInfoCircle,
  IconMapPin,
  IconPalette,
  IconPhone,
  IconSliders,
  IconUploadCloud,
  Input,
  RadioCardGroup,
  Select,
  Textarea,
} from '@/components/ui';

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

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={value.length > max ? 'wizard-counter wizard-counter--over' : 'wizard-counter'}>
      {value.length} / {max.toLocaleString('en-US')}
    </span>
  );
}

function Tag({ tone, children }: { tone: 'required' | 'optional'; children: ReactNode }) {
  return <span className={`wizard-tag wizard-tag--${tone}`}>{children}</span>;
}

function Card({
  icon,
  title,
  subtitle,
  aside,
  children,
}: {
  icon?: ReactNode;
  title?: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="wizard-card">
      {title && (
        <header className="wizard-card__head">
          {icon && (
            <span className="wizard-card__icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="wizard-card__heading">
            <h2 className="wizard-card__title">{title}</h2>
            {subtitle && <span className="wizard-card__subtitle">{subtitle}</span>}
          </span>
          {aside}
        </header>
      )}
      <div className="wizard-card__body">{children}</div>
    </section>
  );
}

export function BasicsStep({ form, errors, update }: StepProps) {
  const name = form.name.trim();
  const nameValid = name.length >= LIMITS.nameMin && name.length <= LIMITS.name;

  return (
    <Card>
      <Input
        label="Community Name"
        aside={
          <>
            <Tag tone="required">Required</Tag> <Counter value={form.name} max={LIMITS.name} />
          </>
        }
        value={form.name}
        onChange={(event) => update('name', event.target.value)}
        placeholder="e.g. Kigali Tech Artisans Cooperative"
        icon={<IconCommunity />}
        maxLength={LIMITS.name}
        autoComplete="organization"
        hint={`${LIMITS.nameMin} to ${LIMITS.name} characters · Appears on certificates and ledgers`}
        error={errors.name}
        trailing={
          nameValid && !errors.name ? (
            <span className="wizard-valid" aria-label="Valid name">
              Valid
            </span>
          ) : undefined
        }
      />

      <RadioCardGroup
        legend="Community Type"
        hint="Select the model that best describes how your group is governed."
        aside={form.type === '' ? undefined : <Tag tone="optional">1 type selected</Tag>}
        name="community-type"
        options={COMMUNITY_TYPES}
        value={form.type}
        onChange={(value) => update('type', value as WizardForm['type'])}
        error={errors.type}
        required
      />

      <RadioCardGroup
        legend="Leadership Committee"
        hint="Do you want officer positions such as Treasurer and Secretary? You can add, rename or delete positions at any time."
        name="committee"
        options={COMMITTEE_OPTIONS}
        value={form.committee}
        onChange={(value) => update('committee', value as WizardForm['committee'])}
        error={errors.with_committee}
      />

      <Textarea
        label="Description"
        aside={
          <>
            <Tag tone="optional">Optional</Tag>{' '}
            <Counter value={form.description} max={LIMITS.description} />
          </>
        }
        value={form.description}
        onChange={(event) => update('description', event.target.value)}
        placeholder="What unites this community, who it is for, and what it does together…"
        rows={4}
        maxLength={LIMITS.description}
        hint="Shown on invitation links and to members."
        error={errors.description}
      />
    </Card>
  );
}

export function PurposeStep({ form, errors, update }: StepProps) {
  return (
    <>
      <Card
        icon={<IconFlag />}
        title="Guiding Purpose"
        subtitle="The long-term commitments and moral anchor of your group"
        aside={<Tag tone="optional">Optional fields</Tag>}
      >
        <Textarea
          label="Vision"
          optional
          aside={<Counter value={form.vision} max={LIMITS.vision} />}
          value={form.vision}
          onChange={(event) => update('vision', event.target.value)}
          placeholder="The future outlook and long-term aspiration of the community…"
          rows={3}
          maxLength={LIMITS.vision}
          error={errors.vision}
        />
        <Textarea
          label="Mission"
          optional
          aside={<Counter value={form.mission} max={LIMITS.mission} />}
          value={form.mission}
          onChange={(event) => update('mission', event.target.value)}
          placeholder="The day-to-day commitment to members and community impact…"
          rows={3}
          maxLength={LIMITS.mission}
          error={errors.mission}
        />
      </Card>

      <Card
        icon={<IconInfoCircle />}
        title="Official Contact Channels"
        subtitle="How members and partners reach the community"
      >
        <Input
          label="Contact Email"
          optional
          type="email"
          value={form.contactEmail}
          onChange={(event) => update('contactEmail', event.target.value)}
          placeholder="info@yourgroup.rw"
          icon={<IconAtSign />}
          autoComplete="email"
          maxLength={LIMITS.email}
          error={errors.contact_email}
        />
        <Input
          label="Contact Phone"
          optional
          type="tel"
          value={form.contactPhone}
          onChange={(event) => update('contactPhone', event.target.value)}
          placeholder="788 123 456"
          inputMode="tel"
          autoComplete="tel-national"
          leading={
            <span className="wizard-dial">
              <IconPhone />
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
          hint="Saved in international format, e.g. +250788123456."
          error={errors.contact_phone}
        />
        <Input
          label="Physical Address / Office"
          optional
          value={form.contactAddress}
          onChange={(event) => update('contactAddress', event.target.value)}
          placeholder="KG 12 Ave, Nyarugenge, Kigali"
          icon={<IconMapPin />}
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
      <Card
        icon={<IconPalette />}
        title="Branding & Media"
        subtitle="Helps members recognise the community at a glance"
        aside={<Tag tone="optional">Optional</Tag>}
      >
        <div className="wizard-media">
          <ImageDrop
            label="Community Logo"
            ratio="1:1 ratio"
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
            label="Cover Banner"
            ratio="16:9 ratio"
            icon={<IconImage width={24} height={24} />}
            prompt="or drag and drop"
            hint="PNG, JPG or WebP · 1200 × 675 px recommended · max 5 MB"
            browseLabel="Browse banner"
            spec={COVER_SPEC}
            shape="wide"
            value={form.cover}
            onChange={(value) => update('cover', value)}
            error={errors.cover_url}
          />
        </div>
      </Card>

      <Card
        icon={<IconSliders />}
        title="Localization & Accounting"
        subtitle="Ledger currency, the language members are written to in, and your history"
      >
        <div className="form-grid form-grid--3">
          <Select
            label="Primary Currency"
            options={CURRENCIES}
            value={form.currency}
            onChange={(event) => update('currency', event.target.value)}
            hint="Used for every contribution"
            error={errors.currency}
            required
          />
          <Select
            label="Primary Language"
            options={LANGUAGES}
            value={form.language}
            onChange={(event) => update('language', event.target.value)}
            hint="For notifications and emails"
            error={errors.language}
            required
          />
          <Input
            label="Founded Year"
            optional
            type="number"
            inputMode="numeric"
            value={form.foundedYear}
            onChange={(event) => update('foundedYear', event.target.value)}
            placeholder={String(currentYear())}
            icon={<IconCalendar />}
            min={LIMITS.yearMin}
            max={currentYear()}
            hint={`${LIMITS.yearMin}–${currentYear()}`}
            error={errors.founded_year}
          />
        </div>
      </Card>
    </>
  );
}
