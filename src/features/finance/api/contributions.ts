import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { Contribution, ContributionDetail } from './my-contributions';
import type { ContributionStatus, ContributionType } from './types';

/** Query of `GET /communities/{id}/contributions/` (S3-05). */
export interface ContributionFilters {
  /** `YYYY-MM`: payments for that month, and the month the summary describes. */
  month?: string;
  status?: ContributionStatus;
  type?: ContributionType;
  /** A membership id. */
  member?: string;
  /** Part of the member's name or of the payment reference. */
  search?: string;
  page?: number;
  page_size?: number;
}

/** The month the list is about: expected vs received, from every active member's shares. */
export interface ContributionMonthSummary {
  year: number;
  month: number;
  currency: string;
  expected_minor: number;
  received_minor: number;
  pending_minor: number;
  /** received / expected as a percentage; null when nothing is expected. */
  collection_rate: number | null;
  paid_count: number;
  member_count: number;
}

export interface CommunityContributions {
  items: Contribution[];
  total: number;
  page: number;
  page_size: number;
  summary: ContributionMonthSummary;
}

function toQuery(filters: ContributionFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

/** Every member reads every record (1 Nov decision); reviewers act on them. */
export function useCommunityContributions(
  communityId: string | undefined,
  filters: ContributionFilters,
) {
  return useQuery({
    queryKey: queryKeys.finance.contributions(communityId ?? '', { ...filters }),
    queryFn: () =>
      apiFetch<CommunityContributions>(
        `/communities/${communityId ?? ''}/contributions/?${toQuery(filters)}`,
      ),
    enabled: communityId !== undefined,
    // Paging keeps the old rows on screen until the next page arrives.
    placeholderData: keepPreviousData,
  });
}

interface DecisionInput {
  communityId: string;
  contributionId: string;
}

/** Any money decision changes every finance figure: refresh them all. */
function useFinanceMutation<TInput extends DecisionInput, TResult>(
  request: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (_result, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all(communityId) });
    },
  });
}

const path = ({ communityId, contributionId }: DecisionInput, action: string) =>
  `/communities/${communityId}/contributions/${contributionId}/${action}/`;

/** Pending -> confirmed. The member is emailed. */
export function useConfirmContribution() {
  return useFinanceMutation((input: DecisionInput) =>
    apiFetch<ContributionDetail>(path(input, 'confirm'), { method: 'POST' }),
  );
}

/** Pending -> rejected, with a reason the member is emailed. */
export function useRejectContribution() {
  return useFinanceMutation((input: DecisionInput & { reason: string }) =>
    apiFetch<ContributionDetail>(path(input, 'reject'), {
      method: 'POST',
      body: { reason: input.reason },
    }),
  );
}

/** Confirmed -> reversed (bounced, or recorded twice), with a reason. */
export function useReverseContribution() {
  return useFinanceMutation((input: DecisionInput & { reason: string }) =>
    apiFetch<ContributionDetail>(path(input, 'reverse'), {
      method: 'POST',
      body: { reason: input.reason },
    }),
  );
}

export type ReminderSkipReason =
  'paid' | 'awaiting_confirmation' | 'nothing_owed' | 'recently_reminded';

export interface ReminderResult {
  period: string;
  channel: 'email';
  reminded: number;
  reminded_member_ids: string[];
  skipped: { membership_id: string; reason: ReminderSkipReason }[];
  failed_member_ids: string[];
}

/** Email every member who has not paid `month` (at most once a day each). */
export function useSendReminders() {
  return useMutation({
    mutationFn: ({ communityId, month }: { communityId: string; month: string }) =>
      apiFetch<ReminderResult>(`/communities/${communityId}/contributions/reminders/`, {
        method: 'POST',
        body: { month },
      }),
  });
}
