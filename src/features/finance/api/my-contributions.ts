import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

/** An open dedicated contribution (campaign) a member can pay into. */
export interface OpenCampaign {
  id: string;
  title: string;
  budget: { id: string; title: string } | null;
  charge: 'per_share' | 'fixed';
  /** Per share when per_share, per member when fixed. */
  amount_minor: number;
  currency: string;
  required: boolean;
  due_date: string | null;
  my_share: {
    /** What you are asked to pay; null when voluntary. */
    owed_minor: number | null;
    paid_minor: number;
    pending_minor: number;
    outstanding_minor: number | null;
  };
}

/** Open dedicated contributions, for the "what is this payment for" choice. */
export function useOpenCampaigns(communityId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.finance.openCampaigns(communityId ?? ''),
    queryFn: () =>
      apiFetch<{ items: OpenCampaign[] }>(
        `/communities/${communityId ?? ''}/campaigns/?status=open&page_size=100`,
      ),
    enabled: enabled && communityId !== undefined,
  });
}

export interface RecordContributionInput {
  communityId: string;
  amount_minor: number;
  contribution_type: ContributionType;
  campaign_id?: string;
  /** ISO date, not in the future. */
  paid_at: string;
  period_year?: number;
  period_month?: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  /** JPG, PNG or PDF, 5 MB or smaller. */
  proof?: File;
}

/**
 * `POST /communities/{id}/contributions/`: the caller's own payment, sent as
 * multipart so the proof travels with it. It always starts `pending` until
 * the Treasurer confirms or rejects it.
 */
export function useRecordContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ communityId, proof, ...fields }: RecordContributionInput) => {
      const body = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== '') body.append(key, String(value));
      }
      if (proof) body.append('proof', proof);
      return apiFetch<ContributionDetail>(`/communities/${communityId}/contributions/`, {
        method: 'POST',
        body,
      });
    },
    onSuccess: (_created, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all(communityId) });
    },
  });
}

/** `POST .../contributions/{id}/proofs/`: a proof for your own pending payment. */
export function useAttachProof() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      communityId,
      contributionId,
      proof,
    }: {
      communityId: string;
      contributionId: string;
      proof: File;
    }) => {
      const body = new FormData();
      body.append('proof', proof);
      return apiFetch<ContributionDetail>(
        `/communities/${communityId}/contributions/${contributionId}/proofs/`,
        { method: 'POST', body },
      );
    },
    onSuccess: (_r, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all(communityId) });
    },
  });
}
