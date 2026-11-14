/*
 * What the community profile page and the dashboard agree on: which fields
 * make a profile "complete", and who may change which field.
 *
 * The permission split mirrors the backend's
 * `communities.services.permissions_for_community_update`: currency, language
 * and contact details need `community.settings.manage`, everything else
 * `community.update` (as do the logo and cover uploads). The server checks
 * again; this only keeps the page from offering a change that would be refused.
 */
import type { Community, UpdateCommunityRequest } from '../../api/communities';

export const PROFILE_PERMISSION = 'community.update';
export const SETTINGS_PERMISSION = 'community.settings.manage';

export type EditableField = keyof Required<UpdateCommunityRequest>;

/** Fields that need `community.settings.manage` rather than `community.update`. */
export const SETTINGS_FIELDS: ReadonlySet<EditableField> = new Set<EditableField>([
  'currency',
  'language',
  'contact_email',
  'contact_phone',
  'contact_address',
]);

export function permissionFor(field: EditableField): string {
  return SETTINGS_FIELDS.has(field) ? SETTINGS_PERMISSION : PROFILE_PERMISSION;
}

export interface MissingField {
  key: 'description' | 'vision' | 'mission' | 'contact' | 'logo' | 'cover';
  label: string;
}

function blank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/**
 * The parts of a profile members look for that are still empty. Contact
 * counts as present when there is any way to reach the community.
 */
export function missingProfileFields(community: Community): MissingField[] {
  const missing: MissingField[] = [];
  if (blank(community.description)) missing.push({ key: 'description', label: 'description' });
  if (blank(community.vision)) missing.push({ key: 'vision', label: 'vision' });
  if (blank(community.mission)) missing.push({ key: 'mission', label: 'mission' });
  if (
    blank(community.contact_email) &&
    blank(community.contact_phone) &&
    blank(community.contact_address)
  ) {
    missing.push({ key: 'contact', label: 'contact details' });
  }
  if (blank(community.logo_url)) missing.push({ key: 'logo', label: 'logo' });
  if (blank(community.cover_url)) missing.push({ key: 'cover', label: 'cover banner' });
  return missing;
}

/** "description, vision and logo". */
export function listInWords(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
