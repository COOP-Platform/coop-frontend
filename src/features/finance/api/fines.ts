/*
 * Fines (backend finance/fines.py, fine_views.py).
 *
 * Rules ("late after the 10th: 1,000 RWF") only suggest fines; whoever holds
 * finance.fine.issue issues each one. A fine is paid by `fine` contributions
 * naming it, which count once the Treasurer confirms them. A fine is never
 * deleted: it is waived, with a reason.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import { useFinanceWrite } from './expenses';
import type { MemberRef } from './types';

export type FineKind = 'late_payment' | 'meeting_absence' | 'other';
export type FineStatus = 'issued' | 'waived';

export interface FineRule {
  id: string;
  name: string;
  kind: FineKind;
  amount_minor: number;
  currency: string;
  /** late_payment only: a payment after this day of the month is late (1-28). */
  late_after_day: number | null;
  is_active: boolean;
  created_at: string;
}

export interface FineMeetingRef {
  id: string;
  title: string;
  scheduled_at: string;
}

export interface Fine {
  id: string;
  member: MemberRef;
  kind: FineKind;
  rule: { id: string; name: string } | null;
  amount_minor: number;
  currency: string;
  reason: string;
  period_year: number | null;
  period_month: number | null;
  meeting: FineMeetingRef | null;
  status: FineStatus;
  /** Confirmed fine payments. */
  paid_minor: number;
  /** Fine payments waiting for the Treasurer. */
  pending_minor: number;
  /** Still to pay; 0 once paid in full or waived. */
  outstanding_minor: number;
  is_paid: boolean;
  issued_by: MemberRef;
  created_at: string;
  waived_by: MemberRef | null;
  waived_at: string | null;
  waive_reason: string | null;
}

export interface FineFilters {
  status?: FineStatus;
  membership_id?: string;
  kind?: FineKind;
  outstanding?: boolean;
  page?: number;
  page_size?: number;
}

export interface FinePage {
  items: Fine[];
  total: number;
  page: number;
  page_size: number;
  total_outstanding_minor: number;
}

export interface MyFines {
  items: Fine[];
  total_outstanding_minor: number;
}

export interface FineSuggestion {
  /** Stable for one suggestion: rule + member + month or meeting. */
  key: string;
  kind: FineKind;
  rule: { id: string; name: string };
  member: MemberRef;
  amount_minor: number;
  reason: string;
  period_year: number | null;
  period_month: number | null;
  meeting: FineMeetingRef | null;
}

const base = (communityId: string | undefined) => `/communities/${communityId ?? ''}`;

function toQuery(filters: FineFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

/** `GET .../fine-rules/` (finance.fine.manage). */
export function useFineRules(communityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.finance.fineRules(communityId ?? ''),
    queryFn: () => apiFetch<FineRule[] | { items: FineRule[] }>(`${base(communityId)}/fine-rules/`),
    select: (data) => (Array.isArray(data) ? data : data.items),
    enabled: communityId !== undefined && enabled,
  });
}

/** `GET .../fines/` (finance.fine.issue), with the total still owed. */
export function useFines(communityId: string | undefined, filters: FineFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.finance.fines(communityId ?? '', { ...filters }),
    queryFn: () => apiFetch<FinePage>(`${base(communityId)}/fines/${toQuery(filters)}`),
    enabled: communityId !== undefined && enabled,
    placeholderData: keepPreviousData,
  });
}

/** `GET .../fines/suggestions/`: what the active rules say is due and not yet fined. */
export function useFineSuggestions(communityId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.finance.fineSuggestions(communityId ?? ''),
    queryFn: () => apiFetch<{ items: FineSuggestion[] }>(`${base(communityId)}/fines/suggestions/`),
    enabled: communityId !== undefined && enabled,
  });
}

/** `GET .../fines/me/`: any member's own fines. */
export function useMyFines(communityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.finance.myFines(communityId ?? ''),
    queryFn: () => apiFetch<MyFines>(`${base(communityId)}/fines/me/`),
    enabled: communityId !== undefined,
  });
}

export interface RuleFields {
  name: string;
  kind: FineKind;
  amount_minor: number;
  late_after_day: number | null;
  is_active?: boolean;
}

export function useCreateFineRule() {
  return useFinanceWrite(({ communityId, ...body }: { communityId: string } & RuleFields) =>
    apiFetch<FineRule>(`${base(communityId)}/fine-rules/`, { method: 'POST', body }),
  );
}

export function useUpdateFineRule() {
  return useFinanceWrite(
    ({
      communityId,
      ruleId,
      ...body
    }: { communityId: string; ruleId: string } & Partial<RuleFields>) =>
      apiFetch<FineRule>(`${base(communityId)}/fine-rules/${ruleId}/`, { method: 'PATCH', body }),
  );
}

export function useDeleteFineRule() {
  return useFinanceWrite(({ communityId, ruleId }: { communityId: string; ruleId: string }) =>
    apiFetch<unknown>(`${base(communityId)}/fine-rules/${ruleId}/`, { method: 'DELETE' }),
  );
}

export interface IssueFineInput {
  communityId: string;
  membership_id: string;
  kind: FineKind;
  amount_minor: number;
  reason: string;
  rule_id?: string;
  period_year?: number;
  period_month?: number;
  meeting_id?: string;
}

/** `POST .../fines/`; 409 `already_fined` when that month or meeting is already fined. */
export function useIssueFine() {
  return useFinanceWrite(({ communityId, ...body }: IssueFineInput) =>
    apiFetch<Fine>(`${base(communityId)}/fines/`, { method: 'POST', body }),
  );
}

export function useWaiveFine() {
  return useFinanceWrite(
    ({ communityId, fineId, reason }: { communityId: string; fineId: string; reason: string }) =>
      apiFetch<Fine>(`${base(communityId)}/fines/${fineId}/waive/`, {
        method: 'POST',
        body: { reason },
      }),
  );
}
