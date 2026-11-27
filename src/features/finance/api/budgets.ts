import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { toQuery, useFinanceWrite } from './expenses';
import type { MemberRef } from './types';

/*
 * Budgets (backend S3-37) and dedicated contributions (S3-38).
 *
 * A budget plans spending for an event or a project in lines; it is funded by
 * the dedicated contributions opened for it and by the wallet for anything
 * beyond. Expenses are tagged to it. Closing a budget closes its open
 * dedicated contributions too (1 Nov decision). Every member reads them;
 * finance.budget.manage / finance.campaign.manage change them.
 */

/** per_share: amount x shares; fixed: the same per member; any: each member decides. */
export type CampaignCharge = 'per_share' | 'fixed' | 'any' | 'per_category';

/** per_category: what each member category pays (0 = not asked). */
export interface CategoryAmount {
  category_id: string;
  name: string;
  amount_minor: number;
}

export interface Budget {
  id: string;
  title: string;
  event: { id: string; title: string } | null;
  status: 'active' | 'closed';
  currency: string;
  /** The sum of the lines. */
  planned_minor: number;
  /** Confirmed payments into its dedicated contributions. */
  raised_minor: number;
  /** Approved expenses tagged to it. */
  spent_minor: number;
  pending_spent_minor: number;
  /** Planned - spent; negative when overspent. */
  left_to_spend_minor: number;
  /** Spent beyond what was raised, so taken from the wallet. */
  from_wallet_minor: number;
  progress: { spent_percent: number | null; raised_percent: number | null };
  created_at: string;
  closed_at: string | null;
}

export interface BudgetDetail extends Budget {
  description: string | null;
  lines: {
    id: string;
    title: string;
    position: number;
    planned_minor: number;
    spent_minor: number;
    left_to_spend_minor: number;
    progress_percent: number | null;
  }[];
  unallocated_spent_minor: number;
  campaigns: {
    id: string;
    title: string;
    status: 'open' | 'closed';
    charge: CampaignCharge;
    /** Null when any amount. */
    amount_minor: number | null;
    required: boolean;
    due_date: string | null;
    collected_minor: number;
    expected_minor: number | null;
  }[];
  created_by: MemberRef;
  closed_by: MemberRef | null;
  close_note: string | null;
  updated_at: string;
}

export function useBudgets(communityId: string | undefined, status?: 'active' | 'closed') {
  return useQuery({
    queryKey: queryKeys.finance.budgets(communityId ?? '', status ?? 'all'),
    queryFn: () =>
      apiFetch<{ items: Budget[]; total: number }>(
        `/communities/${communityId ?? ''}/budgets/?${toQuery({ status, page_size: 100 })}`,
      ),
    enabled: communityId !== undefined,
  });
}

export function useBudgetDetail(communityId: string | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.budget(communityId ?? '', id ?? ''),
    queryFn: () => apiFetch<BudgetDetail>(`/communities/${communityId ?? ''}/budgets/${id ?? ''}/`),
    enabled: communityId !== undefined && id !== undefined,
  });
}

export interface BudgetLineInput {
  /** On edit: an existing line to keep. */
  id?: string;
  title: string;
  planned_minor: number;
}

export interface BudgetInput {
  communityId: string;
  /** On create only: the event this budget is for (one budget per event). */
  event_id?: string;
  title?: string;
  description?: string | null;
  lines?: BudgetLineInput[];
}

export function useCreateBudget() {
  return useFinanceWrite(({ communityId, ...body }: BudgetInput) =>
    apiFetch<BudgetDetail>(`/communities/${communityId}/budgets/`, { method: 'POST', body }),
  );
}

/** Title, description and lines (the list replaces the old one). */
export function useUpdateBudget() {
  return useFinanceWrite(({ communityId, budgetId, ...body }: BudgetInput & { budgetId: string }) =>
    apiFetch<BudgetDetail>(`/communities/${communityId}/budgets/${budgetId}/`, {
      method: 'PATCH',
      body,
    }),
  );
}

/** Closes the budget and its open dedicated contributions. */
export function useCloseBudget() {
  return useFinanceWrite(
    ({ communityId, budgetId, note }: { communityId: string; budgetId: string; note?: string }) =>
      apiFetch<BudgetDetail>(`/communities/${communityId}/budgets/${budgetId}/close/`, {
        method: 'POST',
        body: { note: note || undefined },
      }),
  );
}

// ---------------------------------------------------------------------------
// Dedicated contributions (campaigns)
// ---------------------------------------------------------------------------

export interface Campaign {
  id: string;
  title: string;
  budget: { id: string; title: string } | null;
  charge: CampaignCharge;
  /** Per share when per_share, per member when fixed; null when any or per_category. */
  amount_minor: number | null;
  /** per_category only; empty otherwise. */
  category_amounts: CategoryAmount[];
  currency: string;
  /** False: voluntary, nothing is owed. */
  required: boolean;
  due_date: string | null;
  status: 'open' | 'closed';
  expected_minor: number | null;
  collected_minor: number;
  pending_minor: number;
  progress_percent: number | null;
  member_count: number;
  paid_count: number;
  fully_paid_count: number | null;
  my_share: {
    owed_minor: number | null;
    paid_minor: number;
    pending_minor: number;
    outstanding_minor: number | null;
  };
  created_at: string;
  closed_at: string | null;
}

export interface CampaignDetail extends Campaign {
  description: string | null;
  created_by: MemberRef;
  closed_by: MemberRef | null;
  updated_at: string;
}

export function useCampaigns(communityId: string | undefined, status?: 'open' | 'closed') {
  return useQuery({
    queryKey: queryKeys.finance.campaigns(communityId ?? '', status ?? 'all'),
    queryFn: () =>
      apiFetch<{ items: Campaign[]; total: number }>(
        `/communities/${communityId ?? ''}/campaigns/?${toQuery({ status, page_size: 100 })}`,
      ),
    enabled: communityId !== undefined,
  });
}

export interface CampaignInput {
  communityId: string;
  title?: string;
  description?: string | null;
  charge?: CampaignCharge;
  /** Left out for any amount. */
  amount_minor?: number | null;
  /** per_category: what each member category pays. */
  category_amounts?: { category_id: string; amount_minor: number }[];
  required?: boolean;
  due_date?: string | null;
  budget_id?: string | null;
}

export function useCreateCampaign() {
  return useFinanceWrite(({ communityId, ...body }: CampaignInput) =>
    apiFetch<CampaignDetail>(`/communities/${communityId}/campaigns/`, { method: 'POST', body }),
  );
}

export function useUpdateCampaign() {
  return useFinanceWrite(
    ({
      communityId,
      campaignId,
      title,
      description,
      charge,
      amount_minor,
      category_amounts,
      required,
      due_date,
    }: CampaignInput & { campaignId: string }) =>
      apiFetch<CampaignDetail>(`/communities/${communityId}/campaigns/${campaignId}/`, {
        method: 'PATCH',
        body: { title, description, charge, amount_minor, category_amounts, required, due_date },
      }),
  );
}

export function useCloseCampaign() {
  return useFinanceWrite(
    ({ communityId, campaignId }: { communityId: string; campaignId: string }) =>
      apiFetch<CampaignDetail>(`/communities/${communityId}/campaigns/${campaignId}/close/`, {
        method: 'POST',
      }),
  );
}
