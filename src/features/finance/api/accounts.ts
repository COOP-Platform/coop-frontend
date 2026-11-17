import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { useFinanceWrite } from './expenses';
import type { MemberRef } from './types';

/*
 * The Treasurer's accounts, or channels (backend finance/accounts.py): the
 * bank, MoMo number and cash box where the money actually sits. A balance
 * starts from the last one typed in, then moves on its own: confirmed
 * contributions paid into the account add to it, and money put in or taken
 * out by hand moves it. Shown next to the wallet, never part of it, so a gap
 * between the records and the accounts is visible. Every member reads them;
 * finance.account.manage keeps them.
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
  /** Bank account number or MoMo phone number members send money to. */
  number: string | null;
  /** The name it is registered under. */
  holder_name: string | null;
  currency: string;
  is_active: boolean;
  /**
   * What the account holds now: the last balance typed in (0 when none), plus
   * confirmed contributions paid into it since, plus money in and minus money
   * out entered by hand since. Null when there is nothing at all.
   */
  balance_minor: number | null;
  /** The last balance typed in; null when none. */
  entered_balance_minor: number | null;
  /** The day that balance was read. */
  as_of: string | null;
  /** Null (with every balance field) for members who may not see balances. */
  contributions_since_minor: number | null;
  /** Money in minus money out, entered by hand since `as_of`. */
  movements_since_minor: number | null;
  latest_balance: AccountBalance | null;
  entered_manually: boolean | null;
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

export type MovementDirection = 'in' | 'out';

/** Money the Treasurer put into, or took out of, an account by hand. */
export interface AccountMovement {
  id: string;
  direction: MovementDirection;
  amount_minor: number;
  on: string;
  note: string | null;
  entered_by: MemberRef | null;
  entered_at: string;
}

export function useAccountMovements(
  communityId: string | undefined,
  accountId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.finance.accountMovements(communityId ?? '', accountId ?? ''),
    queryFn: () =>
      apiFetch<{ items: AccountMovement[]; total: number }>(
        `/communities/${communityId ?? ''}/finance/accounts/${accountId ?? ''}/movements/?page_size=100`,
      ),
    enabled: communityId !== undefined && accountId !== undefined,
  });
}

/** Put money into, or take it out of, an account by hand. */
export function useAddMovement() {
  return useFinanceWrite(
    ({
      communityId,
      accountId,
      ...body
    }: {
      communityId: string;
      accountId: string;
      direction: MovementDirection;
      amount_minor: number;
      /** YYYY-MM-DD, not in the future; today when absent. */
      on?: string;
      note?: string;
    }) =>
      apiFetch<AccountMovement>(
        `/communities/${communityId}/finance/accounts/${accountId}/movements/`,
        { method: 'POST', body },
      ),
  );
}

/** Active accounts, for "Paid into" when recording or approving a payment. */
export function useChannels(communityId: string | undefined) {
  const accounts = useAccounts(communityId);
  return (accounts.data?.items ?? []).filter((a) => a.is_active);
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
    }: {
      communityId: string;
      name: string;
      kind: AccountKind;
      number?: string;
      holder_name?: string;
    } & BalanceFields) =>
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
      number?: string;
      holder_name?: string;
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
