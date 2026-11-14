/*
 * Arrears (ibirarane): the months a member still owes, across every year.
 *
 * A confirmed payment for a month pays that month; arrears payments and any
 * extra pay the oldest unpaid months of the same year. Money waiting for the
 * Treasurer is reported per month but never counted until confirmed.
 */
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { MemberRef } from './types';

export interface Period {
  year: number;
  month: number;
}

export interface ArrearsMonth extends Period {
  owed_minor: number;
  paid_minor: number;
  /** Still to pay; always more than 0. */
  remaining_minor: number;
  /** Recorded for this month and waiting for the Treasurer. */
  pending_minor: number;
  /**
   * The payment type a new payment for this month can use: a member holds at
   * most one monthly and one arrears payment per month. Null when both are
   * taken, and the Treasurer has to sort it out.
   */
  record_as: 'arrears' | 'monthly' | null;
}

/** `GET /communities/{id}/contributions/me/arrears/` */
export interface MemberArrears {
  currency: string;
  total_minor: number;
  pending_minor: number;
  months_behind: number;
  oldest: Period | null;
  /** Unpaid months only, oldest first. */
  months: ArrearsMonth[];
  years: { year: number; remaining_minor: number }[];
}

/** `GET /communities/{id}/contributions/arrears/{membership_id}/` */
export interface MemberArrearsWithMember extends MemberArrears {
  member: MemberRef;
}

export interface ArrearsRow {
  member: MemberRef;
  total_minor: number;
  pending_minor: number;
  months_behind: number;
  oldest: Period | null;
}

/** `GET /communities/{id}/contributions/arrears/` */
export interface CommunityArrears {
  currency: string;
  total_minor: number;
  members_behind: number;
  active_members: number;
  /** Members who are behind, most owed first. */
  items: ArrearsRow[];
}

export function useMyArrears(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.myArrears(communityId ?? ''),
    queryFn: () =>
      apiFetch<MemberArrears>(`/communities/${communityId ?? ''}/contributions/me/arrears/`),
    enabled: communityId !== undefined,
  });
}

/** Everyone who is behind; only for whoever confirms payments. */
export function useCommunityArrears(communityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.finance.communityArrears(communityId ?? ''),
    queryFn: () =>
      apiFetch<CommunityArrears>(`/communities/${communityId ?? ''}/contributions/arrears/`),
    enabled: communityId !== undefined && enabled,
  });
}

export function useMemberArrears(
  communityId: string | undefined,
  membershipId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.finance.memberArrears(communityId ?? '', membershipId ?? ''),
    queryFn: () =>
      apiFetch<MemberArrearsWithMember>(
        `/communities/${communityId ?? ''}/contributions/arrears/${membershipId ?? ''}/`,
      ),
    enabled: communityId !== undefined && membershipId !== undefined,
  });
}

/** `{year: 2026, month: 3}` -> `2026-03`, the record form's period. */
export function toPeriod({ year, month }: Period): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}
