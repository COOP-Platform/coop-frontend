import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { toQuery, useFinanceWrite } from './expenses';
import type { MemberRef, PaymentMethod } from './types';

/*
 * Income (backend S3-35, finance/income.py): money in that is not a member's
 * contribution. New income starts `pending` and counts for nothing until
 * someone other than the recorder, holding finance.income.approve, approves
 * it (status `recorded`) or rejects it with a reason. Never edited; approved
 * income that was a mistake is reversed with a reason.
 */

export type IncomeSource = 'donation' | 'event_revenue' | 'interest' | 'other';
/** `recorded` is approved income (or income from before approval existed): it counts. */
export type IncomeStatus = 'pending' | 'recorded' | 'rejected' | 'reversed';

export interface Income {
  id: string;
  title: string;
  source: IncomeSource;
  amount_minor: number;
  currency: string;
  received_on: string;
  received_from: string | null;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  memo: string | null;
  status: IncomeStatus;
  has_receipt: boolean;
  recorded_by: MemberRef;
  approved_by: MemberRef | null;
  approved_at: string | null;
  rejected_by: MemberRef | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  /** You may approve or reject it: pending, you hold the right, and you did not record it. */
  can_approve: boolean;
  reversed_by: MemberRef | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeDetail extends Income {
  receipt_url: string | null;
}

export interface IncomeFilters {
  month?: string;
  source?: IncomeSource;
  status?: IncomeStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface IncomeList {
  items: Income[];
  total: number;
  page: number;
  page_size: number;
  summary: {
    currency: string;
    /** Approved (counted) income the filters match. */
    total_income_minor: number;
    /** Approved rows. */
    count: number;
    reversed_count: number;
    /** Waiting for approval: does not count yet. */
    pending_minor: number;
    pending_count: number;
  };
}

export function useIncomeList(communityId: string | undefined, filters: IncomeFilters) {
  return useQuery({
    queryKey: queryKeys.finance.income(communityId ?? '', { ...filters }),
    queryFn: () =>
      apiFetch<IncomeList>(`/communities/${communityId ?? ''}/income/?${toQuery(filters)}`),
    enabled: communityId !== undefined,
    placeholderData: keepPreviousData,
  });
}

export function useIncomeDetail(communityId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.incomeDetail(communityId ?? '', id ?? ''),
    queryFn: () => apiFetch<IncomeDetail>(`/communities/${communityId ?? ''}/income/${id ?? ''}/`),
    enabled: communityId !== undefined && id !== undefined,
  });
}

export interface RecordIncomeInput {
  communityId: string;
  title: string;
  source: IncomeSource;
  amount_minor: number;
  received_on: string;
  received_from?: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  memo?: string;
  receipt?: File;
}

export function useRecordIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ communityId, receipt, ...fields }: RecordIncomeInput) => {
      const body = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== '') body.append(key, String(value));
      }
      if (receipt) body.append('receipt', receipt);
      return apiFetch<IncomeDetail>(`/communities/${communityId}/income/`, {
        method: 'POST',
        body,
      });
    },
    onSuccess: (_r, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all(communityId) });
    },
  });
}

export function useReverseIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      communityId,
      incomeId,
      reason,
    }: {
      communityId: string;
      incomeId: string;
      reason: string;
    }) =>
      apiFetch<IncomeDetail>(`/communities/${communityId}/income/${incomeId}/reverse/`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: (_r, { communityId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.finance.all(communityId) });
    },
  });
}

interface IncomeAction {
  communityId: string;
  incomeId: string;
}

/** Someone else's pending income starts counting. 403 `own_income` on your own. */
export function useApproveIncome() {
  return useFinanceWrite(({ communityId, incomeId }: IncomeAction) =>
    apiFetch<IncomeDetail>(`/communities/${communityId}/income/${incomeId}/approve/`, {
      method: 'POST',
    }),
  );
}

/** It never counts; the reason stays on the record. */
export function useRejectIncome() {
  return useFinanceWrite(({ communityId, incomeId, reason }: IncomeAction & { reason: string }) =>
    apiFetch<IncomeDetail>(`/communities/${communityId}/income/${incomeId}/reject/`, {
      method: 'POST',
      body: { reason },
    }),
  );
}
