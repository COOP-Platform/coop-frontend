import { useQuery } from '@tanstack/react-query';

import { ApiError, apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { useFinanceWrite } from './expenses';
import type { MemberRef } from './types';

/*
 * Year-end close (backend FinancialYearClose). The Treasurer closes a year
 * once it is over and nothing in it is still waiting for a decision; from
 * then on nothing dated in that year can be recorded, changed or reversed
 * (writes fail with 409 `year_closed`). Reopening takes a reason.
 * Listing needs finance.report.view; closing and reopening finance.year.close.
 */

export type YearStatus = 'open' | 'closed';

/**
 * The year's figures as they were at closing, for the General Assembly
 * (backend finance/years.py `year_summary`). Money in uses confirmed
 * contributions by paid_at and approved income; money out approved expenses.
 */
export interface YearSummary {
  year: number;
  currency: string;
  money_in: {
    total_minor: number;
    contributions_minor: number;
    income_minor: number;
    /** By contribution type, e.g. `{monthly: 1200000}`. */
    contributions_by_type: Record<string, number>;
    /** By income source. */
    income_by_source: Record<string, number>;
  };
  money_out: {
    total_minor: number;
    /** By category; `uncategorised` for expenses with none. */
    expenses_by_category: Record<string, number>;
  };
  net_minor: number;
  /** The wallet on 31 December. */
  closing_balance_minor: number;
  /** What active, paying members still owed for the year's months. */
  outstanding_minor: number;
  members_with_outstanding: number;
}

export interface FinancialYear {
  year: number;
  status: YearStatus;
  closed_at: string | null;
  closed_by: MemberRef | null;
  note: string | null;
  /** Kept at closing; null (or empty) while the year is open. */
  summary: YearSummary | null;
  /** Payments, expenses and income dated in the year still waiting for a decision. */
  pending_count: number;
}

export function useFinancialYears(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.years(communityId ?? ''),
    queryFn: () =>
      apiFetch<{ items: FinancialYear[] }>(`/communities/${communityId ?? ''}/finance/years/`),
    enabled: communityId !== undefined,
  });
}

interface YearAction {
  communityId: string;
  year: number;
}

/** 400 `year_not_over`; 409 `pending_items` (see {@link pendingItems}). */
export function useCloseYear() {
  return useFinanceWrite(({ communityId, year, note }: YearAction & { note?: string }) =>
    apiFetch<FinancialYear>(`/communities/${communityId}/finance/years/${year}/close/`, {
      method: 'POST',
      body: note ? { note } : {},
    }),
  );
}

export function useReopenYear() {
  return useFinanceWrite(({ communityId, year, reason }: YearAction & { reason: string }) =>
    apiFetch<FinancialYear>(`/communities/${communityId}/finance/years/${year}/reopen/`, {
      method: 'POST',
      body: { reason },
    }),
  );
}

export interface PendingCounts {
  contributions: number;
  expenses: number;
  income: number;
}

/**
 * The 409 `pending_items` refusal counts what is still waiting, by kind:
 * `{error: {code, year, contributions, expenses, income}}`. Null for any other error.
 */
export function pendingItems(error: unknown): PendingCounts | null {
  if (!(error instanceof ApiError) || error.code !== 'pending_items') return null;
  const detail = (error.body as { error?: Record<string, unknown> } | null)?.error ?? {};
  const count = (key: keyof PendingCounts) =>
    typeof detail[key] === 'number' ? (detail[key] as number) : 0;
  return {
    contributions: count('contributions'),
    expenses: count('expenses'),
    income: count('income'),
  };
}
