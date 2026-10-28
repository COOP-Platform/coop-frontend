/*
 * The unfinished create-community form, kept per user in this browser.
 *
 * Local only — there is no drafts endpoint — so it survives a reload, "Save &
 * Exit" and a lapsed session, but not a change of device. Keyed by user id so
 * two people sharing a browser never see each other's draft. Storage can
 * throw (private mode, quota — an uploaded cover is the heavy part), so every
 * access is guarded and a failure only means the draft is not kept.
 */
import { getUser } from '@/lib/auth/session';

import { INITIAL_FORM } from './model';
import type { StepIndex, WizardForm } from './model';

interface Draft {
  form: WizardForm;
  step: StepIndex;
  savedAt: string;
}

function key(): string | null {
  const user = getUser();
  return user === null ? null : `coop.community-draft.${user.id}`;
}

export function loadDraft(): Draft | null {
  const storageKey = key();
  if (storageKey === null) {
    return null;
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) {
      return null;
    }
    const draft = JSON.parse(raw) as Partial<Draft>;
    // Merged over the defaults so a draft saved before a field existed still loads.
    return {
      form: { ...INITIAL_FORM, ...draft.form },
      step: draft.step ?? 0,
      savedAt: draft.savedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Returns whether it was actually stored. */
export function saveDraft(form: WizardForm, step: StepIndex): boolean {
  const storageKey = key();
  if (storageKey === null) {
    return false;
  }
  const draft: Draft = { form, step, savedAt: new Date().toISOString() };
  try {
    localStorage.setItem(storageKey, JSON.stringify(draft));
    return true;
  } catch {
    // Most likely the images pushed it over quota: keep the words at least.
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...draft, form: { ...form, logo: '', cover: '' } }),
      );
    } catch {
      return false;
    }
    return true;
  }
}

export function clearDraft(): void {
  const storageKey = key();
  if (storageKey === null) {
    return;
  }
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Nothing to do.
  }
}

export function hasDraft(): boolean {
  return loadDraft() !== null;
}
