import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { SAMPLE_MY_CONTRIBUTIONS } from '../data/sample-my-contributions';
import { isMissingEndpoint } from './sample';

export type ContributionStatus = 'PENDING' | 'PAID' | 'REJECTED' | 'REVERSED';
export type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'BANK_TRANSFER' | 'CASH';
/** To be confirmed with Les Cousins (Sprint 3-5 brief). */
export type ContributionPurpose = 'MONTHLY' | 'WELFARE' | 'SPECIAL_LEVY';

/** A row of `GET /me/contributions`. Amounts are whole RWF. */
export interface MyContribution {
  id: string;
  amount: number;
  purpose: ContributionPurpose;
  method: PaymentMethod;
  status: ContributionStatus;
  /** ISO date, `2026-10-30`. */
  paid_on: string;
  reference: string;
}

export interface MyContributions {
  summary: {
    total_contributed: number;
    count: number;
    outstanding: number;
    on_time_rate: number;
  };
  items: MyContribution[];
  total: number;
  page: number;
  page_size: number;
}

/** One entry of a contribution's status history. */
export interface ContributionHistoryEntry {
  status: ContributionStatus;
  by: { id: string; name: string };
  at: string;
}

/** `GET /contributions/{id}` — what the details drawer adds to the list row. */
export interface ContributionDetail extends MyContribution {
  reviewed_by: { id: string; name: string } | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  reversal: { amount: number; reason: string; at: string } | null;
  history: ContributionHistoryEntry[];
}

/**
 * The signed-in member's own contributions for a year.
 *
 * `/me/contributions` is not on the live backend yet, so until it answers this
 * answers 404 this returns the design's sample rows and says so with
 * `isSample`. Once the API responds its data replaces them with no change on
 * the screen's side.
 */
export function useMyContributions(communityId: string | undefined, year: number) {
  const query = useQuery({
    queryKey: queryKeys.finance.myContributions(communityId ?? '', year),
    queryFn: () =>
      apiFetch<MyContributions>(
        `/me/contributions?community_id=${communityId ?? ''}&year=${year}&page=1&page_size=100`,
      ),
    enabled: communityId !== undefined,
    // A missing endpoint answers 404 straight away; retrying only delays the sample.
    retry: false,
  });

  if (query.data) {
    return { data: query.data, isPending: false, error: null, isSample: false };
  }
  if (isMissingEndpoint(query.error)) {
    return { data: SAMPLE_MY_CONTRIBUTIONS, isPending: false, error: null, isSample: true };
  }
  return { data: undefined, isPending: query.isPending, error: query.error, isSample: false };
}

/** Loaded when the drawer opens. Skipped for sample rows, which have no server record. */
export function useContributionDetail(
  communityId: string | undefined,
  id: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.finance.contribution(communityId ?? '', id ?? ''),
    queryFn: () => apiFetch<ContributionDetail>(`/contributions/${id ?? ''}`),
    enabled: enabled && communityId !== undefined && id !== undefined,
    retry: false,
  });
}
