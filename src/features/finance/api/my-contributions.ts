import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { ContributionStatus, ContributionType, MemberRef, PaymentMethod } from './types';

/** One contribution, as `GET /communities/{id}/contributions/...` returns it. */
export interface Contribution {
  id: string;
  member: MemberRef;
  member_category: { id: string; name: string };
  amount_minor: number;
  currency: string;
  contribution_type: ContributionType;
  /** Set for a dedicated contribution; `id` is null when its event is hidden from you. */
  campaign: { id: string | null; title: string; is_private: boolean } | null;
  period_year: number;
  /** The month a monthly payment covers, 1-12. */
  period_month: number | null;
  /** ISO date the money was paid. */
  paid_at: string;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  status: ContributionStatus;
  recorded_by: MemberRef;
  confirmed_by: MemberRef | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  rejected_by: MemberRef | null;
  rejected_at: string | null;
  reversed_by: MemberRef | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  reversal: {
    amount_minor: number;
    currency: string;
    reason: string;
    by: MemberRef | null;
    at: string;
  } | null;
  proof_count: number;
  can_view_proofs: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContributionHistoryEntry {
  status: ContributionStatus;
  by: MemberRef | null;
  at: string;
  reason: string | null;
}

export interface ContributionProof {
  id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_by: MemberRef;
  created_at: string;
  /** Signed link, valid for 10 minutes. */
  url: string | null;
}

/** `GET /communities/{id}/contributions/{contribution_id}/` */
export interface ContributionDetail extends Contribution {
  /** Null (not empty) when you may not open the proof files. */
  proofs: ContributionProof[] | null;
  history: ContributionHistoryEntry[];
}

/** `GET /communities/{id}/contributions/me/?year=` */
export interface MyContributions {
  shares: {
    category: { id: string; name: string };
    share_price_minor: number;
    count: number;
    owed_per_month_minor: number;
  };
  summary: {
    year: number;
    currency: string;
    owed_to_date_minor: number;
    /** Confirmed payments of every type. */
    total_contributed_minor: number;
    pending_minor: number;
    outstanding_minor: number;
    count: number;
    /** Null until there is a confirmed monthly payment to measure. */
    on_time_rate: number | null;
  };
  items: Contribution[];
  total: number;
  page: number;
  page_size: number;
}

/** The signed-in member's own contributions for a year (up to 100, newest first). */
export function useMyContributions(communityId: string | undefined, year: number) {
  return useQuery({
    queryKey: queryKeys.finance.myContributions(communityId ?? '', year),
    queryFn: () =>
      apiFetch<MyContributions>(
        `/communities/${communityId ?? ''}/contributions/me/?year=${year}&page=1&page_size=100`,
      ),
    enabled: communityId !== undefined,
  });
}

/** Loaded when the drawer opens: the review trail and the proof files. */
export function useContributionDetail(communityId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.contribution(communityId ?? '', id ?? ''),
    queryFn: () =>
      apiFetch<ContributionDetail>(`/communities/${communityId ?? ''}/contributions/${id ?? ''}/`),
    enabled: communityId !== undefined && id !== undefined,
  });
}

export const receiptPath = (communityId: string, contributionId: string) =>
  `/communities/${communityId}/contributions/${contributionId}/receipt/`;

export const statementPath = (communityId: string, year: number) =>
  `/communities/${communityId}/contributions/me/statement/?year=${year}`;
