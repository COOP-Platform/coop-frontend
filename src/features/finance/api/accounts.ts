import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { useFinanceWrite } from './expenses';
import type { MemberRef } from './types';

/*
 * The Treasurer's accounts (backend S3-10b, finance/accounts.py): the bank,
 * mobile money and cash box where the money actually sits, with the balance
 * typed in each time it is read. Shown next to the wallet, never part of it,
 * so a gap between the records and the accounts is visible. Every member
 * reads them; finance.account.manage keeps them.
 */

export type AccountKind = 'bank' | 'mobile_money' | 'cash' | 'other';

export interface AccountBalance {
  id: string;
  balance_minor: number;
  as_of: string;
  note: string | null;
  entered_by?: MemberRef | null;
  entered_at: string;
  entered_manually: boolean;
}

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  is_active: boolean;
  /** The latest balance entered; null when none yet. */
  balance_minor: number | null;
  as_of: string | null;
  latest_balance: AccountBalance | null;
  entered_manually: boolean;
  created_by: MemberRef;
  created_at: string;
  retired_by: MemberRef | null;
  retired_at: string | null;
}

export function useAccounts(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.accounts(communityId ?? ''),
    queryFn: () =>
      apiFetch<{ items: Account[]; total: number }>(
        `/communities/${communityId ?? ''}/finance/accounts/?page_size=100`,
      ),
    enabled: communityId !== undefined,
  });
}

export function useAccountBalances(communityId: string | undefined, accountId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.accountBalances(communityId ?? '', accountId ?? ''),
    queryFn: () =>
      apiFetch<{ items: AccountBalance[]; total: number }>(
        `/communities/${communityId ?? ''}/finance/accounts/${accountId ?? ''}/balances/?page_size=100`,
      ),
    enabled: communityId !== undefined && accountId !== undefined,
  });
}

interface BalanceFields {
  balance_minor?: number;
  /** YYYY-MM-DD, not in the future; today when absent. */
  as_of?: string;
  note?: string;
}

/** A new account, optionally with its first balance. */
export function useCreateAccount() {
  return useFinanceWrite(
    ({
      communityId,
      ...body
    }: { communityId: string; name: string; kind: AccountKind } & BalanceFields) =>
      apiFetch<Account>(`/communities/${communityId}/finance/accounts/`, { method: 'POST', body }),
  );
}

export function useUpdateAccount() {
  return useFinanceWrite(
    ({
      communityId,
      accountId,
      ...body
    }: {
      communityId: string;
      accountId: string;
      name?: string;
      kind?: AccountKind;
    }) =>
      apiFetch<Account>(`/communities/${communityId}/finance/accounts/${accountId}/`, {
        method: 'PATCH',
        body,
      }),
  );
}

/** Type in what the account holds now (a statement, a MoMo balance). */
export function useEnterBalance() {
  return useFinanceWrite(
    ({
      communityId,
      accountId,
      ...body
    }: { communityId: string; accountId: string } & BalanceFields) =>
      apiFetch<AccountBalance>(
        `/communities/${communityId}/finance/accounts/${accountId}/balances/`,
        { method: 'POST', body },
      ),
  );
}

export function useRetireAccount() {
  return useFinanceWrite(({ communityId, accountId }: { communityId: string; accountId: string }) =>
    apiFetch<Account>(`/communities/${communityId}/finance/accounts/${accountId}/retire/`, {
      method: 'POST',
    }),
  );
}
