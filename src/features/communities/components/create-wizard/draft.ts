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
  /**
   * 2 added the Positions step at index 1. A draft without it was saved by
   * the three-step wizard, so its step is moved along one past Basics.
   */
  version?: number;
}

const DRAFT_VERSION = 2;

/** Drop keys an older wizard stored that the form no longer has (`committee`). */
function knownFields(saved: Partial<WizardForm> | undefined): Partial<WizardForm> {
  if (saved === undefined) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(saved).filter(([field]) => field in INITIAL_FORM),
  ) as Partial<WizardForm>;
}

function restoredStep(draft: Partial<Draft>): StepIndex {
  const step = draft.step ?? 0;
  if (draft.version === undefined && step > 0) {
    return Math.min(step + 1, 3) as StepIndex;
  }
  return step;
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
      form: { ...INITIAL_FORM, ...knownFields(draft.form) },
      step: restoredStep(draft),
      savedAt: draft.savedAt ?? new Date().toISOString(),
      version: DRAFT_VERSION,
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
  const draft: Draft = {
    form,
    step,
    savedAt: new Date().toISOString(),
    version: DRAFT_VERSION,
  };
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
