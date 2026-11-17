import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

/*
 * Community report (backend communities/reports.py): members now, who joined
 * (on join_date) and who left (on removed_at) in a year, members by category,
 * and the roster. Every member may read it (member.view); invitation counts
 * come only to those who may invite, `null` for everyone else.
 */

/** The backend accepts years 2020-2100. */
export const MIN_REPORT_YEAR = 2020;

export interface MembersReport {
  year: number;
  members: { active: number; suspended: number; total: number };
  joined: number;
  left: number;
  months: { month: number; joined: number; left: number }[];
  by_category: { id: string | null; name: string; members: number }[];
  invitations: {
    pending: number;
    accepted: number;
    expired: number;
    revoked: number;
    rejected: number;
  } | null;
  roster: {
    membership_id: string;
    full_name: string;
    category: string | null;
    status: 'active' | 'suspended';
    /** ISO date, or null for an old member without one. */
    join_date: string | null;
    positions: string[];
  }[];
}

export function useMembersReport(communityId: string | null | undefined, year: number) {
  return useQuery({
    queryKey: ['communities', communityId, 'reports', 'members', year],
    queryFn: () =>
      apiFetch<MembersReport>(`/communities/${communityId}/reports/members/?year=${year}`),
    enabled: Boolean(communityId),
  });
}
