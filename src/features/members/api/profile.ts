/*
 * One member's profile (frontend #10), from
 * `/communities/{cid}/members/{mid}/profile/`, `history/` and `photo/`
 * (backend `communities.member_profile`).
 *
 * The server decides what each viewer gets: the emergency contact and notes
 * are null unless you are the member or hold `member.update`
 * (`private_visible`), and `photo_url` is a short-lived signed link.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

import type { MembershipStatus } from './memberships';

export interface MemberProfile {
  id: string;
  community: string;
  user: string;
  full_name: string;
  email: string;
  status: MembershipStatus;
  join_date: string | null;
  activated_at: string | null;
  suspended_at: string | null;
  removed_at: string | null;
  shares: number;
  member_category: { id: string; name: string };
  family_relationship: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  /** Signed link, valid for about ten minutes. */
  photo_url: string | null;
  is_you: boolean;
  /** False: emergency contact and notes were withheld, not empty. */
  private_visible: boolean;
  can_edit_own: boolean;
  can_change_photo: boolean;
  can_view_history: boolean;
}

export interface MemberHistoryEvent {
  id: string;
  at: string;
  action: string;
  label: string;
  from_status: string | null;
  to_status: string | null;
  actor_name: string | null;
  detail: string | null;
}

/** Fields only the member may change on their own profile. */
export interface OwnProfileInput {
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  family_relationship?: string;
}

/** Fields someone who manages members may change (`member.update` / `member.suspend`). */
export interface ManagedProfileInput {
  member_category?: string;
  notes?: string;
  status?: 'active' | 'suspended';
}

export type ProfileInput = OwnProfileInput & ManagedProfileInput;

const base = (communityId: string, membershipId: string) =>
  `/communities/${communityId}/members/${membershipId}`;

const profileKey = (communityId: string, membershipId: string) =>
  [...queryKeys.memberships.detail(membershipId), 'profile', communityId] as const;

const historyKey = (communityId: string, membershipId: string) =>
  [...queryKeys.memberships.detail(membershipId), 'history', communityId] as const;

export function useMemberProfile(communityId: string | undefined, membershipId: string) {
  return useQuery({
    queryKey: profileKey(communityId ?? '', membershipId),
    queryFn: () => apiFetch<MemberProfile>(`${base(communityId ?? '', membershipId)}/profile/`),
    enabled: communityId !== undefined && communityId !== '',
    // The photo link expires after ten minutes; fetch a fresh one before that.
    staleTime: 5 * 60 * 1000,
    refetchInterval: 8 * 60 * 1000,
  });
}

export function useMemberHistory(
  communityId: string | undefined,
  membershipId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: historyKey(communityId ?? '', membershipId),
    queryFn: () =>
      apiFetch<MemberHistoryEvent[]>(`${base(communityId ?? '', membershipId)}/history/`),
    enabled: enabled && communityId !== undefined && communityId !== '',
  });
}

function useProfileWrite<TVariables>(
  communityId: string,
  membershipId: string,
  request: (variables: TVariables) => Promise<MemberProfile>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: request,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKey(communityId, membershipId), profile);
      void queryClient.invalidateQueries({ queryKey: historyKey(communityId, membershipId) });
      // The list carries status and category too.
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.memberships.all, 'list'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

/** PATCH the profile. The server refuses fields the caller may not change. */
export function useUpdateMemberProfile(communityId: string, membershipId: string) {
  return useProfileWrite(communityId, membershipId, (input: ProfileInput) =>
    apiFetch<MemberProfile>(`${base(communityId, membershipId)}/profile/`, {
      method: 'PATCH',
      body: input,
    }),
  );
}

/** Upload (or replace) the photo: JPEG, PNG or WebP up to 5 MB. */
export function useUploadMemberPhoto(communityId: string, membershipId: string) {
  return useProfileWrite(communityId, membershipId, (file: File) => {
    const body = new FormData();
    body.append('file', file, file.name);
    return apiFetch<MemberProfile>(`${base(communityId, membershipId)}/photo/`, {
      method: 'POST',
      body,
    });
  });
}

export function useRemoveMemberPhoto(communityId: string, membershipId: string) {
  return useProfileWrite(communityId, membershipId, () =>
    apiFetch<MemberProfile>(`${base(communityId, membershipId)}/photo/`, { method: 'DELETE' }),
  );
}

/** A sentence for a failed photo upload; 503 means the server has no storage set up. */
export function photoErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && (error.status === 503 || error.status === 404)) {
    return 'Photo uploads are not available on this server yet.';
  }
  if (error instanceof ApiError && error.status === 502) {
    return 'The photo could not be saved. Please try again.';
  }
  return null;
}

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
