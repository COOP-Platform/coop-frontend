import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Button, Input, Select, Textarea } from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { ApiError } from '@/lib/api/client';
import { errorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/query-keys';

import { useUpdateCommunity } from '../../api/communities';
import type { Community, CommunityType, UpdateCommunityRequest } from '../../api/communities';
import { COMMUNITY_TYPES } from '../create-wizard/community-types';
import { CURRENCIES, LANGUAGES, LIMITS } from '../create-wizard/model';
import { permissionFor } from './profile';
import type { EditableField } from './profile';

type FormState = Record<EditableField, string>;

function toForm(community: Community): FormState {
  return {
    name: community.name,
    type: community.type,
    description: community.description ?? '',
    vision: community.vision ?? '',
    mission: community.mission ?? '',
    contact_email: community.contact_email ?? '',
    contact_phone: community.contact_phone ?? '',
    contact_address: community.contact_address ?? '',
    currency: community.currency,
    language: community.language,
  };
}

/** Keep a stored value selectable even if it is not in our short list. */
function withCurrent(options: readonly SelectOption[], current: string): readonly SelectOption[] {
  return options.some((o) => o.value === current) || current === ''
    ? options
    : [{ value: current, label: current }, ...options];
}

const TYPE_OPTIONS: readonly SelectOption[] = COMMUNITY_TYPES.map((t) => ({
  value: t.value,
  label: t.title,
}));

/** Checks the server would make, run first so the member gets them at once. */
function validate(form: FormState): Partial<Record<EditableField, string>> {
  const errors: Partial<Record<EditableField, string>> = {};
  const name = form.name.trim();
  if (name.length < LIMITS.nameMin) {
    errors.name = `Give the community a name of at least ${LIMITS.nameMin} characters.`;
  }
  const email = form.contact_email.trim();
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.contact_email = 'Enter an email address like name@example.com.';
  }
  const phone = form.contact_phone.replace(/\s+/g, '');
  if (phone !== '' && !/^\+[1-9]\d{7,14}$/.test(phone)) {
    errors.contact_phone = 'Start with + and the country code, e.g. +250788123456.';
  }
  return errors;
}

interface ProfileFormProps {
  community: Community;
  can: (permission: string) => boolean;
  onCancel: () => void;
  onSaved: (community: Community, changed: number) => void;
}

/**
 * Edit everything the community says about itself. Only fields the member
 * changed are sent, so someone who may edit the profile but not the
 * settings (or the other way round) is never refused for a field they did
 * not touch; fields they may not change at all are shown read-only.
 */
export function ProfileForm({ community, can, onCancel, onSaved }: ProfileFormProps) {
  const queryClient = useQueryClient();
  const update = useUpdateCommunity();
  const [form, setForm] = useState<FormState>(() => toForm(community));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const original = toForm(community);
  const editable = (field: EditableField) => can(permissionFor(field));

  function set(field: EditableField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changes(): UpdateCommunityRequest {
    const out: Record<string, string> = {};
    for (const field of Object.keys(form) as EditableField[]) {
      if (!editable(field)) continue;
      const value =
        field === 'contact_phone' ? form[field].replace(/\s+/g, '') : form[field].trim();
      if (value !== original[field].trim()) out[field] = value;
    }
    return out as UpdateCommunityRequest;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const local = validate(form);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      return;
    }
    const body = changes();
    const count = Object.keys(body).length;
    if (count === 0) {
      onSaved(community, 0);
      return;
    }
    try {
      const saved = await update.mutateAsync({ id: community.id, changes: body });
      queryClient.setQueryData(queryKeys.communities.detail(saved.id), saved);
      // The name and type also appear in /auth/me (switcher, dashboard header).
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      onSaved(saved, count);
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) {
        setErrors(caught.fieldErrors);
        const unplaced = Object.keys(caught.fieldErrors).filter((key) => !(key in form));
        if (unplaced.length > 0) setFormError(errorMessage(caught));
      } else {
        setFormError(errorMessage(caught));
      }
    }
  }

  const readOnlyHint = 'Your position cannot change this.';
  const field = (name: EditableField) => ({
    value: form[name],
    error: errors[name],
    disabled: !editable(name) || update.isPending,
  });

  return (
    <form className="cs-form" onSubmit={(event) => void submit(event)} noValidate>
      <fieldset className="cs-form__section">
        <legend className="cs-form__legend">About</legend>
        <Input
          label="Community name"
          required
          maxLength={LIMITS.name}
          {...field('name')}
          hint={editable('name') ? undefined : readOnlyHint}
          onChange={(event) => set('name', event.target.value)}
        />
        <Select
          label="Community type"
          options={withCurrent(TYPE_OPTIONS, form.type)}
          {...field('type')}
          hint={editable('type') ? undefined : readOnlyHint}
          onChange={(event) => set('type', event.target.value as CommunityType)}
        />
        <Textarea
          label="Description"
          optional
          rows={4}
          maxLength={LIMITS.description}
          counter
          placeholder="Who you are and what brings you together."
          {...field('description')}
          hint={editable('description') ? undefined : readOnlyHint}
          onChange={(event) => set('description', event.target.value)}
        />
        <Textarea
          label="Vision"
          optional
          rows={3}
          maxLength={LIMITS.vision}
          counter
          placeholder="The future your community is working towards."
          {...field('vision')}
          hint={editable('vision') ? undefined : readOnlyHint}
          onChange={(event) => set('vision', event.target.value)}
        />
        <Textarea
          label="Mission"
          optional
          rows={3}
          maxLength={LIMITS.mission}
          counter
          placeholder="What you do, day to day, to get there."
          {...field('mission')}
          hint={editable('mission') ? undefined : readOnlyHint}
          onChange={(event) => set('mission', event.target.value)}
        />
      </fieldset>

      <fieldset className="cs-form__section">
        <legend className="cs-form__legend">Contact &amp; preferences</legend>
        <div className="cs-form__grid">
          <Input
            label="Contact email"
            optional
            type="email"
            autoComplete="email"
            maxLength={LIMITS.email}
            {...field('contact_email')}
            hint={editable('contact_email') ? undefined : readOnlyHint}
            onChange={(event) => set('contact_email', event.target.value)}
          />
          <Input
            label="Contact phone"
            optional
            type="tel"
            autoComplete="tel"
            placeholder="+250788123456"
            {...field('contact_phone')}
            hint={editable('contact_phone') ? 'Include the country code.' : readOnlyHint}
            onChange={(event) => set('contact_phone', event.target.value)}
          />
        </div>
        <Input
          label="Address or meeting place"
          optional
          maxLength={LIMITS.address}
          {...field('contact_address')}
          hint={editable('contact_address') ? undefined : readOnlyHint}
          onChange={(event) => set('contact_address', event.target.value)}
        />
        <div className="cs-form__grid">
          <Select
            label="Currency"
            options={withCurrent(CURRENCIES, form.currency)}
            {...field('currency')}
            hint={editable('currency') ? 'Used for all amounts.' : readOnlyHint}
            onChange={(event) => set('currency', event.target.value)}
          />
          <Select
            label="Language"
            options={withCurrent(LANGUAGES, form.language)}
            {...field('language')}
            hint={editable('language') ? undefined : readOnlyHint}
            onChange={(event) => set('language', event.target.value)}
          />
        </div>
      </fieldset>

      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}

      <div className="cs-form__actions">
        <Button type="button" variant="tint" inline onClick={onCancel} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" inline disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
