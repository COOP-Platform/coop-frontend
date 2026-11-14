/*
 * The Platform Administrator API (`platform_admin` in the backend, #21).
 *
 * Every endpoint is a GET. Platform Administrators run the service; none of
 * this can change anything inside a community, and opening one community's
 * records (the support view) is written to that community's audit log.
 */
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';

const keys = {
  health: ['platform', 'health'] as const,
  communities: ['platform', 'communities'] as const,
  auditLog: (filters: AuditLogFilters) => ['platform', 'audit-log', filters] as const,
};

/** `PlatformHealthView`: counts only, never what any of it says. */
export interface PlatformHealth {
  database: 'ok' | 'unavailable';
  communities: number;
  users: number;
  pending_invitations: number;
  invitations_without_email: number;
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: keys.health,
    queryFn: () => apiFetch<PlatformHealth>('/platform/health/'),
    refetchInterval: 60_000,
  });
}

/** `DirectoryCommunitySerializer`: enough to find a community, no member data. */
export interface DirectoryCommunity {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: 'active' | 'suspended' | 'archived';
  created_at: string;
  /** Active members only. */
  member_count: number;
}

export function usePlatformCommunities() {
  return useQuery({
    queryKey: keys.communities,
    queryFn: () => apiFetch<DirectoryCommunity[]>('/platform/communities/'),
  });
}

/** `SupportViewSerializer`. Carries no money: no contributions, expenses or balances. */
export interface SupportView {
  community: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
    currency: string;
    language: string;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string;
  };
  memberships: {
    id: string;
    full_name: string;
    status: 'invited' | 'active' | 'suspended' | 'removed';
    join_date: string | null;
    member_category: string;
    positions: string[];
  }[];
  invitations: {
    id: string;
    email: string;
    status: string;
    expires_at: string;
    invitation_email_sent_at: string | null;
    credential_email_sent_at: string | null;
    created_at: string;
  }[];
  /** The audit-log row recording this very read. */
  audit_entry_id: number;
}

/** `platform_admin.views.SUPPORT_REASON_MIN_LENGTH`. */
export const SUPPORT_REASON_MIN_LENGTH = 5;

/**
 * Opening a community is a mutation as far as the UI is concerned: every
 * call writes an audit entry, so it is never cached, prefetched or retried
 * behind the admin's back.
 */
export function useOpenSupportView() {
  return useMutation({
    mutationFn: ({ communityId, reason }: { communityId: string; reason: string }) =>
      apiFetch<SupportView>(
        `/platform/communities/${communityId}/support/?reason=${encodeURIComponent(reason)}`,
      ),
  });
}

/** `PlatformAuditEntrySerializer`: metadata only, never the before/after data. */
export interface PlatformAuditEntry {
  id: number;
  created_at: string;
  action: string;
  entity_type: string;
  entity_id: string;
  community: { id: string; name: string } | null;
  actor: { id: string; full_name: string; email: string } | null;
  ip_address: string | null;
}

export interface AuditLogPage {
  items: PlatformAuditEntry[];
  total: number;
  page: number;
  page_size: number;
}

export interface AuditLogFilters {
  page: number;
  pageSize: number;
  community?: string;
  action?: string;
}

/** The support view's own audit action (`platform_admin.services.SUPPORT_READ_ACTION`). */
export const SUPPORT_READ_ACTION = 'platform.support.read';

export function usePlatformAuditLog(filters: AuditLogFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    page_size: String(filters.pageSize),
  });
  if (filters.community) params.set('community', filters.community);
  if (filters.action) params.set('action', filters.action);

  return useQuery({
    queryKey: keys.auditLog(filters),
    queryFn: () => apiFetch<AuditLogPage>(`/platform/audit-log/?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}
