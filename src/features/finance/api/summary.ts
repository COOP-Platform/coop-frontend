import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { SAMPLE_SUMMARY } from '../data/sample-summary';
import { isMissingEndpoint } from './sample';

/** Money in or out of the community's books. */
export type ActivityDirection = 'IN' | 'OUT';

export interface FinanceActivity {
  type: 'CONTRIBUTION' | 'EXPENSE';
  id: string;
  title: string;
  member?: { id: string; name: string } | null;
  /** Whole RWF, always positive; `direction` says which way it moved. */
  amount: number;
  direction: ActivityDirection;
  at: string;
  /*
   * The two fields below are in the design but not in the Sprint 3-5 brief's
   * summary payload. They are shown when the backend sends them and left out
   * otherwise — see docs/sprint-3-finance.md.
   */
  detail?: string;
  method?: string;
}

export interface FinanceAccount {
  name: string;
  balance: number;
  entered_manually: boolean;
  /** Design-only subtitle ("MoMo float"). */
  detail?: string;
}

/**
 * `GET /finance/summary` (Sprint 3-5 brief). All money is whole RWF.
 * Members see totals only, so the two lists may arrive empty for them.
 */
export interface FinanceSummary {
  period: { from: string; to: string };
  total_contributions: number;
  total_expenses: number;
  outstanding: number;
  outstanding_count: number;
  current_balance: number;
  members: { active: number; up_to_date: number; compliance_rate: number };
  recent_activity: FinanceActivity[];
  accounts: FinanceAccount[];
}

export interface FinanceSummaryResult {
  /** Undefined while loading, or when the request failed for a real reason. */
  summary: FinanceSummary | undefined;
  isPending: boolean;
  error: unknown;
  /** True while the figures on screen are the design's placeholders, not the API's. */
  isSample: boolean;
}

/**
 * The dashboard's figures.
 *
 * The endpoint is not on the live backend yet (checked against its OpenAPI
 * schema), so while it answers 404 this returns the design's sample numbers and
 * says so with `isSample`. The moment the API responds, its figures replace
 * them with no change on the screen's side.
 */
export function useFinanceSummary(communityId: string | undefined): FinanceSummaryResult {
  const year = new Date().getFullYear();
  const query = useQuery({
    queryKey: queryKeys.finance.summary(communityId ?? '', year),
    queryFn: () =>
      apiFetch<FinanceSummary>(`/finance/summary?community_id=${communityId ?? ''}&year=${year}`),
    enabled: communityId !== undefined,
    // A missing endpoint answers 404 straight away; retrying only delays the sample.
    retry: false,
  });

  if (query.data) {
    return { summary: query.data, isPending: false, error: null, isSample: false };
  }
  if (isMissingEndpoint(query.error)) {
    return { summary: SAMPLE_SUMMARY, isPending: false, error: null, isSample: true };
  }
  return { summary: undefined, isPending: query.isPending, error: query.error, isSample: false };
}
