import { useQuery } from '@tanstack/react-query';

import { apiDownload, apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/*
 * Finance reports (backend S3-11, finance/reports.py): one period of whole
 * months, four views of the same money. Built from the cash flow, so the
 * totals always match it -- and, when the period reaches this month, the
 * wallet balance. Every member may read them (finance.report.view).
 */

export type ReportType = 'summary' | 'contributions' | 'income' | 'expenses';

interface ReportBase {
  type: ReportType;
  currency: string;
  /** ISO dates: the first day of `from` and the last day of `to`. */
  period: { from: string; to: string };
}

export interface SummaryReport extends ReportBase {
  /** Everything that counted before the first month. */
  opening_balance_minor: number;
  totals: {
    contributions_minor: number;
    income_minor: number;
    money_in_minor: number;
    expenses_minor: number;
    net_minor: number;
  };
  monthly: {
    month: string;
    contributions_minor: number;
    income_minor: number;
    expenses_minor: number;
    net_minor: number;
    running_balance_minor: number;
  }[];
  closing_balance_minor: number;
}

interface Share {
  amount_minor: number;
  count: number;
  percent: number;
}

interface BreakdownBase extends ReportBase {
  total_minor: number;
  count: number;
  monthly: { month: string; amount_minor: number }[];
}

export interface ContributionsReport extends BreakdownBase {
  /** Every contribution type, fixed order, zeros included. */
  by_type: (Share & { key: string; label: string })[];
  by_category: (Share & { id: string; name: string })[];
}

export interface IncomeReport extends BreakdownBase {
  by_source: (Share & { key: string; label: string })[];
}

export interface ExpensesReport extends BreakdownBase {
  /** Largest first; `category` null when uncategorised. */
  by_category: (Share & { category: string | null; label: string })[];
}

interface ReportByType {
  summary: SummaryReport;
  contributions: ContributionsReport;
  income: IncomeReport;
  expenses: ExpensesReport;
}

/** `GET /communities/{id}/finance/reports/?type=&from=YYYY-MM&to=YYYY-MM` (60 months at most). */
export function useReport<T extends ReportType>(
  communityId: string | undefined,
  type: T,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: queryKeys.finance.report(communityId ?? '', type, from, to),
    queryFn: () =>
      apiFetch<ReportByType[T]>(
        `/communities/${communityId ?? ''}/finance/reports/?type=${type}&from=${from}&to=${to}`,
      ),
    enabled: communityId !== undefined,
  });
}

/** The statement as a PDF (the summary report, as the backend lays it out). */
export function downloadStatementPdf(communityId: string, from: string, to: string) {
  return apiDownload(
    `/communities/${communityId}/finance/reports/export/?type=summary&from=${from}&to=${to}&format=pdf`,
    `cash-flow-statement-${from}-to-${to}.pdf`,
  );
}

/** Every money record of the period as CSV, from the cash flow export. */
export function downloadTransactionsCsv(communityId: string, fromDate: string, toDate: string) {
  return apiDownload(
    `/communities/${communityId}/cash-flow/export/?from=${fromDate}&to=${toDate}&format=csv`,
    `cash-flow-${fromDate}-to-${toDate}.csv`,
  );
}
