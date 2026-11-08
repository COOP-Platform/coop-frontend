import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { useFinanceWrite } from './expenses';
import type { MemberRef } from './types';

/*
 * Shares (backend S3-34, finance/shares.py). A share category is a member
 * category with the price of one share per month; a member holds a number of
 * shares in one category, and owes shares x price every month. Every member
 * reads the categories; only finance.shares.manage (the Treasurer) changes them.
 */

export interface ShareCategory {
  id: string;
  name: string;
  description: string | null;
  /** Price of one share per month. */
  share_price_minor: number;
  currency: string;
  period: 'monthly';
  /** Members of it receive money (a stipend) rather than pay. */
  is_stipend_recipient: boolean;
  is_active: boolean;
  member_count: number;
  updated_at: string;
}

export function useShareCategories(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.shareCategories(communityId ?? ''),
    queryFn: () =>
      apiFetch<{ items: ShareCategory[] }>(
        `/communities/${communityId ?? ''}/share-categories/?include_inactive=true&page_size=100`,
      ),
    enabled: communityId !== undefined,
  });
}

export interface ShareCategoryInput {
  communityId: string;
  name?: string;
  description?: string | null;
  share_price_minor?: number;
  is_stipend_recipient?: boolean;
}

export function useCreateShareCategory() {
  return useFinanceWrite(({ communityId, ...body }: ShareCategoryInput) =>
    apiFetch<ShareCategory>(`/communities/${communityId}/share-categories/`, {
      method: 'POST',
      body,
    }),
  );
}

/** Name, description or price. A new price is owed from this month on. */
export function useUpdateShareCategory() {
  return useFinanceWrite(
    ({
      communityId,
      categoryId,
      name,
      description,
      share_price_minor,
    }: ShareCategoryInput & { categoryId: string }) =>
      apiFetch<ShareCategory>(`/communities/${communityId}/share-categories/${categoryId}/`, {
        method: 'PATCH',
        body: { name, description, share_price_minor },
      }),
  );
}

export interface MemberShares {
  member: MemberRef;
  category: { id: string; name: string };
  share_price_minor: number;
  shares: number;
  owed_per_month_minor: number;
  currency: string;
}

/** How many shares a member holds and in which category. */
export function useUpdateMemberShares() {
  return useFinanceWrite(
    ({
      communityId,
      membershipId,
      ...body
    }: {
      communityId: string;
      membershipId: string;
      shares?: number;
      category_id?: string;
    }) =>
      apiFetch<MemberShares>(`/communities/${communityId}/members/${membershipId}/shares/`, {
        method: 'PATCH',
        body,
      }),
  );
}
