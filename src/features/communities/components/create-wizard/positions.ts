/*
 * The wizard's starting positions (#18): suggested by the community type,
 * then renamed, removed, added to and re-permissioned by the founder before
 * the community exists. Sent on the create as `positions` (see
 * `CreatePositionInput`), which replaces the server's own template seeding.
 */
import { useQuery } from '@tanstack/react-query';

import { PERMISSION_CATALOG, MEMBER_BASELINE } from '@/features/positions';
import { apiFetch } from '@/lib/api/client';

import type { CommunityType, CreatePositionInput } from '../../api/communities';

/** `rbac.serializers.PositionTemplateSerializer`. */
export interface PositionTemplate {
  community_type: CommunityType;
  label: string;
  admin_position: string;
  positions: {
    name: string;
    description: string;
    is_admin: boolean;
    permissions: string[];
  }[];
}

export interface PositionDraft {
  /** Local only: a stable React key that survives renames. */
  key: string;
  name: string;
  description: string;
  permissions: string[];
  isAdmin: boolean;
}

/** `rbac.catalog.BASELINE_POSITION`: what an invited member is given on joining. */
export const BASELINE_POSITION = 'Member';

/** `communities.founding_positions.POSITION_NAME_MAX_LENGTH`. */
export const POSITION_NAME_MAX = 60;

/** `communities.founding_positions.MAX_FOUNDING_POSITIONS`. */
export const MAX_POSITIONS = 20;

export const ALL_PERMISSION_CODES: readonly string[] = PERMISSION_CATALOG.map((p) => p.code);

/** The template endpoint is catalogue data: identical for every caller. */
export function usePositionTemplate(type: CommunityType | '', enabled: boolean) {
  return useQuery({
    queryKey: ['position-templates', type],
    queryFn: async () => {
      const templates = await apiFetch<PositionTemplate[]>(
        `/position-templates/?community_type=${encodeURIComponent(type)}`,
      );
      const template = templates[0];
      if (template === undefined) {
        throw new Error('No suggested positions for this community type.');
      }
      return template;
    },
    enabled: enabled && type !== '',
    staleTime: Infinity,
  });
}

function newKey(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fromTemplate(template: PositionTemplate): PositionDraft[] {
  return template.positions.map((position) => ({
    key: newKey(),
    name: position.name,
    description: position.description,
    // The admin position holds the whole catalogue (see `rbac.catalog`).
    permissions: position.is_admin ? [...ALL_PERMISSION_CODES] : [...position.permissions],
    isAdmin: position.is_admin,
  }));
}

/** A blank position starts from what every member can already do. */
export function blankPosition(): PositionDraft {
  return {
    key: newKey(),
    name: '',
    description: '',
    permissions: [...MEMBER_BASELINE],
    isAdmin: false,
  };
}

export function isBaseline(position: PositionDraft): boolean {
  return position.name.trim().toLowerCase() === BASELINE_POSITION.toLowerCase();
}

/** One sentence for the whole list, or undefined when it can be sent. */
export function positionsProblem(positions: readonly PositionDraft[]): string | undefined {
  if (positions.length === 0) {
    return 'Add at least one position — yours, as the administrator.';
  }
  if (positions.length > MAX_POSITIONS) {
    return `A community can start with at most ${MAX_POSITIONS} positions.`;
  }
  const admins = positions.filter((p) => p.isAdmin);
  if (admins.length !== 1) {
    return 'Choose exactly one position as yours. It is the one that runs the community.';
  }
  if (admins.some(isBaseline)) {
    return `Your position cannot be called "${BASELINE_POSITION}": that is the one every new member is given.`;
  }
  if (positions.some((p) => p.name.trim() === '')) {
    return 'Give every position a name, or remove the empty one.';
  }
  if (positions.some((p) => p.name.trim().length > POSITION_NAME_MAX)) {
    return `Keep position names under ${POSITION_NAME_MAX} characters.`;
  }
  const names = positions.map((p) => p.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    return 'Two positions have the same name. Give each one its own.';
  }
  return undefined;
}

export function toPositionsPayload(positions: readonly PositionDraft[]): CreatePositionInput[] {
  return positions.map((position) => ({
    name: position.name.trim(),
    description: position.description.trim() === '' ? undefined : position.description.trim(),
    permissions: position.isAdmin ? [...ALL_PERMISSION_CODES] : [...position.permissions].sort(),
    is_admin: position.isAdmin,
  }));
}

/**
 * The server may answer a bad `positions` list with a sentence, a list of
 * sentences, or one object per position (`[{}, {"name": ["…"]}]`). Pull the
 * first sentence out of whichever it is.
 */
export function positionsErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      const message = positionsErrorMessage(entry);
      if (message !== undefined) {
        return typeof entry === 'object' && entry !== null && !Array.isArray(entry)
          ? `Position ${index + 1}: ${message}`
          : message;
      }
    }
    return undefined;
  }
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value as Record<string, unknown>)) {
      const message = positionsErrorMessage(entry);
      if (message !== undefined) {
        return message;
      }
    }
  }
  return undefined;
}
