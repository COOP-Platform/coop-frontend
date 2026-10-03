/*
 * URL search params for the Members and Invitations lists. Filters live in
 * the URL so a filtered view can be linked to (the dashboard's "Review
 * Invitations" opens the pending tab) and survives a refresh.
 */

export type MemberStatusFilter = 'all' | 'active' | 'suspended';

export interface MembersSearch {
  q?: string;
  status?: MemberStatusFilter;
  /** A position id, or `none` for members holding no position. */
  role?: string;
  page?: number;
}

export function parseMembersSearch(raw: Record<string, unknown>): MembersSearch {
  const status = raw.status;
  const page = Number(raw.page);
  return {
    q: typeof raw.q === 'string' && raw.q !== '' ? raw.q : undefined,
    status: status === 'active' || status === 'suspended' ? status : undefined,
    role: typeof raw.role === 'string' && raw.role !== '' ? raw.role : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

export type InvitationStatusFilter = 'all' | 'pending' | 'accepted' | 'expired';

export interface InvitationsSearch {
  status?: InvitationStatusFilter;
  q?: string;
  /** Invitation id shown in the details rail. */
  selected?: string;
}

export function parseInvitationsSearch(raw: Record<string, unknown>): InvitationsSearch {
  const status = raw.status;
  return {
    status:
      status === 'pending' || status === 'accepted' || status === 'expired' ? status : undefined,
    q: typeof raw.q === 'string' && raw.q !== '' ? raw.q : undefined,
    selected: typeof raw.selected === 'string' ? raw.selected : undefined,
  };
}
