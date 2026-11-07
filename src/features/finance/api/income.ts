import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { toQuery } from './expenses';
import type { MemberRef, PaymentMethod } from './types';

/*
 * Income (backend S3-35, finance/income.py): money in that is not a member's
 * contribution. No approval step: it counts in the wallet as soon as it is
 * recorded. Never edited; a mistake is reversed with a reason.
 */

export type IncomeSource = 'donation' | 'event_revenue' | 'interest' | 'other';
export type IncomeStatus = 'recorded' | 'reversed';

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
    /** Recorded (not reversed) income the filters match. */
    total_income_minor: number;
    count: number;
    reversed_count: number;
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
