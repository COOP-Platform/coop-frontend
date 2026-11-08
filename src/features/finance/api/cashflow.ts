import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { toQuery } from './expenses';
import type { CashFlowItem } from './summary';

/*
 * The community cash box (backend S3-36, finance/cashflow.py). Nothing is
 * stored: money in = confirmed contributions + recorded income, money out =
 * approved expenses, and the balance is the running total. Every member reads
 * it (finance.cashflow.view, the 1 Nov "show every record" decision).
 */

export interface CashFlowMonth {
  /** `YYYY-MM`. */
  month: string;
  money_in: { contributions_minor: number; income_minor: number; total_minor: number };
  money_out: { expenses_minor: number; total_minor: number };
  net_minor: number;
  /** The cash box at the end of that month. */
  closing_balance_minor: number;
}

/** `GET /communities/{id}/cash-flow/?from=YYYY-MM&to=YYYY-MM` (60 months at most). */
export interface CashFlow {
  currency: string;
  period: { from: string; to: string };
  /** Everything that counted before the first month. */
  opening_balance_minor: number;
  months: CashFlowMonth[];
  totals: { money_in_minor: number; money_out_minor: number; net_minor: number };
  closing_balance_minor: number;
  /** The cash box today: the same number as the dashboard's current balance. */
  wallet_balance_minor: number;
}

export function useCashFlow(communityId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.finance.cashFlow(communityId ?? '', from, to),
    queryFn: () =>
      apiFetch<CashFlow>(`/communities/${communityId ?? ''}/cash-flow/?from=${from}&to=${to}`),
    enabled: communityId !== undefined,
  });
}

export interface CashFlowItemFilters {
  /** YYYY-MM-DD; the backend defaults to the first day of this month. */
  from_date?: string;
  /** YYYY-MM-DD; without it the range stops at the end of the from month. */
  to_date?: string;
  direction?: 'in' | 'out';
  source?: 'contribution' | 'income' | 'expense';
  page?: number;
  page_size?: number;
}

export interface CashFlowItemList {
  summary: {
    currency: string;
    money_in_minor: number;
    in_count: number;
    money_out_minor: number;
    out_count: number;
    net_minor: number;
  };
  items: CashFlowItem[];
  total: number;
  page: number;
  page_size: number;
}

/** The money records behind the cash box, newest first. */
export function useCashFlowItems(communityId: string | undefined, filters: CashFlowItemFilters) {
  return useQuery({
    queryKey: queryKeys.finance.cashFlowItems(communityId ?? '', { ...filters }),
    queryFn: () =>
      apiFetch<CashFlowItemList>(
        `/communities/${communityId ?? ''}/cash-flow/items/?${toQuery(filters)}`,
      ),
    enabled: communityId !== undefined,
  });
}

/** Most records one statement loads; far beyond a community's money moves in five years. */
const ALL_ITEMS_CAP_PAGES = 30;

/**
 * Every money record between two dates, newest first, gathered page by page
 * (100 a page). The statement table needs all of them to filter, search and
 * keep a true running balance in the browser.
 */
export function useAllCashFlowItems(
  communityId: string | undefined,
  fromDate: string,
  toDate: string,
) {
  return useQuery({
    queryKey: queryKeys.finance.cashFlowItems(communityId ?? '', {
      all: true,
      from_date: fromDate,
      to_date: toDate,
    }),
    queryFn: async () => {
      const items: CashFlowItem[] = [];
      for (let page = 1; page <= ALL_ITEMS_CAP_PAGES; page += 1) {
        const batch = await apiFetch<CashFlowItemList>(
          `/communities/${communityId ?? ''}/cash-flow/items/?${toQuery({
            from_date: fromDate,
            to_date: toDate,
            page,
            page_size: 100,
          })}`,
        );
        items.push(...batch.items);
        if (items.length >= batch.total) break;
      }
      return items;
    },
    enabled: communityId !== undefined,
  });
}
