import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiDownload, apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { MemberRef, PaymentMethod } from './types';

/*
 * Expenses (backend S3-08, finance/expenses.py): money out of the wallet.
 * Recorded "pending" by the Treasurer; approved or rejected by someone else
 * holding finance.expense.approve; only approved ones leave the wallet. An
 * approved expense is reversed with a reason, never deleted.
 */

export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'reversed';

export interface Expense {
  id: string;
  /** The title. "Private event" when its event is hidden from you. */
  description: string;
  category: string | null;
  amount_minor: number;
  currency: string;
  payee: string | null;
  payment_method: PaymentMethod | null;
  payment_reference: string | null;
  memo: string | null;
  spent_at: string;
  budget: { id: string | null; title: string; is_private: boolean } | null;
  status: ExpenseStatus;
  is_private: boolean;
  has_receipt: boolean;
  recorded_by: MemberRef;
  approved_by: MemberRef | null;
  approved_at: string | null;
  rejection_reason: string | null;
  rejected_by: MemberRef | null;
  rejected_at: string | null;
  reversed_by: MemberRef | null;
  reversed_at: string | null;
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseDetail extends Expense {
  /** Signed link to the receipt, valid 10 minutes. */
  receipt_url: string | null;
}

export interface ExpenseFilters {
  /** `YYYY-MM`. */
  month?: string;
  status?: ExpenseStatus;
  category?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface ExpenseList {
  items: Expense[];
  total: number;
  page: number;
  page_size: number;
  summary: {
    currency: string;
    count: number;
    /** Approved expenses matching the filters: what left the wallet. */
    total_expenses_minor: number;
    approved_count: number;
    pending_minor: number;
    pending_count: number;
  };
}

export function toQuery(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
}

export function useExpenses(communityId: string | undefined, filters: ExpenseFilters) {
  return useQuery({
    queryKey: queryKeys.finance.expenses(communityId ?? '', { ...filters }),
    queryFn: () =>
      apiFetch<ExpenseList>(`/communities/${communityId ?? ''}/expenses/?${toQuery(filters)}`),
    enabled: communityId !== undefined,
    placeholderData: keepPreviousData,
  });
}

export function useExpenseDetail(communityId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.expense(communityId ?? '', id ?? ''),
    queryFn: () =>
      apiFetch<ExpenseDetail>(`/communities/${communityId ?? ''}/expenses/${id ?? ''}/`),
    enabled: communityId !== undefined && id !== undefined,
  });
}

/** An open budget an expense can be spent from. */
export interface BudgetOption {
  id: string;
  title: string;
  /** Confirmed payments into the dedicated contributions that fund it. */
  raised_minor: number;
  /** Approved expenses tagged to it. */
  spent_minor: number;
  /** Planned - spent; negative when overspent. */
  left_to_spend_minor: number;
  currency: string;
}

export function useActiveBudgets(communityId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.finance.activeBudgets(communityId ?? ''),
    queryFn: () =>
      apiFetch<{ items: BudgetOption[] }>(
        `/communities/${communityId ?? ''}/budgets/?status=active&page_size=100`,
      ),
    enabled: enabled && communityId !== undefined,
  });
}

export interface RecordExpenseInput {
  communityId: string;
  description: string;
  category?: string;
  payee?: string;
  amount_minor: number;
  spent_at: string;
  payment_method?: PaymentMethod;
  payment_reference?: string;
  memo?: string;
  budget_id?: string;
  receipt?: File;
}

function useFinanceWrite<TInput extends { communityId: string }, TResult>(
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

/** Multipart, so the receipt travels with it. Starts pending. */
export function useRecordExpense() {
  return useFinanceWrite(({ communityId, receipt, ...fields }: RecordExpenseInput) => {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== '') body.append(key, String(value));
    }
    if (receipt) body.append('receipt', receipt);
    return apiFetch<ExpenseDetail>(`/communities/${communityId}/expenses/`, {
      method: 'POST',
      body,
    });
  });
}

interface ExpenseAction {
  communityId: string;
  expenseId: string;
}

const actionPath = ({ communityId, expenseId }: ExpenseAction, action: string) =>
  `/communities/${communityId}/expenses/${expenseId}/${action}/`;

export function useApproveExpense() {
  return useFinanceWrite((input: ExpenseAction) =>
    apiFetch<ExpenseDetail>(actionPath(input, 'approve'), { method: 'POST' }),
  );
}

export function useRejectExpense() {
  return useFinanceWrite((input: ExpenseAction & { reason: string }) =>
    apiFetch<ExpenseDetail>(actionPath(input, 'reject'), {
      method: 'POST',
      body: { reason: input.reason },
    }),
  );
}

export function useReverseExpense() {
  return useFinanceWrite((input: ExpenseAction & { reason: string }) =>
    apiFetch<ExpenseDetail>(actionPath(input, 'reverse'), {
      method: 'POST',
      body: { reason: input.reason },
    }),
  );
}

/** The filtered list as a CSV file. */
export function downloadExpensesCsv(communityId: string, filters: ExpenseFilters) {
  // The export is the whole filtered list, not one page.
  const rest = { ...filters, page: undefined, page_size: undefined };
  return apiDownload(
    `/communities/${communityId}/expenses/export/?${toQuery({ ...rest, format: 'csv' })}`,
    `expenses-${filters.month ?? 'all'}.csv`,
  );
}
