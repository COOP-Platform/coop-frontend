import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { MemberRef } from './types';

/** One money record, as the cash flow items and the dashboard's recent activity show it. */
export interface CashFlowItem {
  /** ISO date the money moved: paid_at, received_on or spent_at. */
  date: string;
  direction: 'in' | 'out';
  /** Always positive; `direction` says which way it moved. */
  amount_minor: number;
  currency: string;
  /** What it was. "Private event" for an event hidden from the reader. */
  narrative: string;
  /** The contribution type, the income source or the expense category. */
  category: string | null;
  source: { type: 'contribution' | 'income' | 'expense'; id: string };
  /** Who paid or who was paid. Null when hidden. */
  party: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  recorded_by: MemberRef;
  is_private: boolean;
  created_at: string;
}

/** An account the Treasurer keeps (bank, mobile money) with the balance last typed in. */
export interface DashboardAccount {
  id: string;
  name: string;
  kind: 'bank' | 'mobile_money' | 'cash' | 'other';
  /** Latest entered balance; null when none was entered yet. */
  balance_minor: number | null;
  as_of: string | null;
  entered_manually: boolean;
}

/** An open budget, as far as the dashboard uses it. */
export interface ActiveBudget {
  id: string;
  title: string;
}

/**
 * `GET /communities/{id}/finance/summary/?year=` (S3-10). Every member may
 * read it (`finance.report.view`); a list the reader may not see comes back
 * `null`, not empty.
 */
export interface FinanceSummary {
  year: number;
  currency: string;
  period: { from: string; to: string };
  total_contributions_minor: number;
  total_income_minor: number;
  total_expenses_minor: number;
  net_minor: number;
  /** The wallet today, whatever the year. */
  current_balance_minor: number;
  outstanding_minor: number;
  /** How many members owe something. */
  outstanding_count: number;
  members: { active: number; up_to_date: number; compliance_rate: number | null };
  active_budgets: ActiveBudget[] | null;
  recent_activity: CashFlowItem[] | null;
  accounts: DashboardAccount[] | null;
  accounts_total_minor: number | null;
  difference_from_wallet_minor: number | null;
}

export function useFinanceSummary(communityId: string | undefined, year: number) {
  return useQuery({
    queryKey: queryKeys.finance.summary(communityId ?? '', year),
    queryFn: () =>
      apiFetch<FinanceSummary>(`/communities/${communityId ?? ''}/finance/summary/?year=${year}`),
    enabled: communityId !== undefined,
  });
}
