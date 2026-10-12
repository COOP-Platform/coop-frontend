import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query-keys';

/** Mirrors `communities.models.CommunityType`. */
export type CommunityType =
  'family' | 'savings_group' | 'church' | 'cooperative' | 'alumni' | 'ngo' | 'youth_group' | 'club';

export type CommunityStatus = 'active' | 'suspended' | 'archived';

/**
 * What the client may send when creating a community
 * (`CommunityCreateSerializer`). Three things it deliberately does not carry:
 *
 *  - `slug` — generated from the name server-side.
 *  - `owner` — taken from the authenticated user.
 *  - `status` — always starts active.
 *
 * Creating one also enrols the owner as an active member and seeds default
 * contribution categories, so there is nothing left for the client to do
 * afterwards. Only `name` and `type` are required.
 */
export interface CreateCommunityRequest {
  name: string;
  type: CommunityType;
  description?: string;
  vision?: string;
  mission?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  logo_url?: string;
  cover_url?: string;
  currency?: string;
  language?: string;
  founded_year?: number;
}

/** `CommunityUpdateSerializer` accepts a narrower set than create. */
export type UpdateCommunityRequest = Partial<
  Pick<
    CreateCommunityRequest,
    | 'name'
    | 'type'
    | 'description'
    | 'vision'
    | 'mission'
    | 'contact_email'
    | 'contact_phone'
    | 'contact_address'
    | 'currency'
    | 'language'
  >
>;

export interface Community {
  id: string;
  name: string;
  slug: string;
  type: CommunityType;
  description: string | null;
  vision: string | null;
  mission: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  currency: string;
  language: string;
  founded_year: number | null;
  status: CommunityStatus;
  owner: string;
  created_at: string;
  updated_at: string;
}

/** The caller's own communities — owned or joined. Not a platform directory. */
export function useCommunities() {
  return useQuery({
    queryKey: queryKeys.communities.list(),
    queryFn: () => apiFetch<Community[]>('/communities/'),
  });
}

export function useCommunity(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.communities.detail(id ?? ''),
    queryFn: () => apiFetch<Community>(`/communities/${id ?? ''}/`),
    enabled: id !== undefined && id !== '',
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (community: CreateCommunityRequest) =>
      apiFetch<Community>('/communities/', {
        method: 'POST',
        body: community,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
      // The owner is enrolled as part of the create, so their memberships change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export type CommunityImageKind = 'logo' | 'cover';

/**
 * `POST /communities/{id}/logo/` and `/cover/`: multipart, one field `file`,
 * JPEG/PNG/WebP up to 5 MB (SVG is refused). The file goes to object storage
 * and the community comes back with `logo_url` / `cover_url` pointing at it.
 */
export function uploadCommunityImage(
  communityId: string,
  kind: CommunityImageKind,
  file: Blob,
): Promise<Community> {
  const body = new FormData();
  body.append('file', file, `${kind}.${file.type.split('/')[1] ?? 'png'}`);
  return apiFetch<Community>(`/communities/${communityId}/${kind}/`, { method: 'POST', body });
}

function imageErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'The upload did not complete.';
  }
  // 404/405: a server without the upload endpoints. 503: one with them but no
  // storage bucket configured. Either way, nothing the member can fix.
  if (error.status === 404 || error.status === 405 || error.status === 503) {
    return 'Image uploads are not available on this server yet.';
  }
  return error.fieldErrors.file ?? error.message;
}

export interface FoundCommunityInput {
  community: CreateCommunityRequest;
  images: Partial<Record<CommunityImageKind, Blob>>;
}

export interface FoundCommunityResult {
  /** As the server last returned it — after any image that did upload. */
  community: Community;
  /** Images that did not make it, with the reason to show. */
  imageErrors: Partial<Record<CommunityImageKind, string>>;
}

/**
 * Create a community, then attach its images.
 *
 * Images need the community's id, so they can only follow the create. Once
 * the community exists it stays created whatever happens to the images: a
 * founder who loses a logo to a flaky upload should get their community and
 * a note, not an error that invites them to submit — and be refused — again.
 */
export function useFoundCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      community,
      images,
    }: FoundCommunityInput): Promise<FoundCommunityResult> => {
      let created = await apiFetch<Community>('/communities/', {
        method: 'POST',
        body: community,
      });

      const imageErrors: FoundCommunityResult['imageErrors'] = {};
      for (const kind of ['logo', 'cover'] as const) {
        const file = images[kind];
        if (file === undefined) {
          continue;
        }
        try {
          created = await uploadCommunityImage(created.id, kind, file);
        } catch (error) {
          imageErrors[kind] = imageErrorMessage(error);
        }
      }

      return { community: created, imageErrors };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.all });
      // The owner is enrolled as part of the create, so their memberships change.
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
  });
}

export function useUpdateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: UpdateCommunityRequest }) =>
      apiFetch<Community>(`/communities/${id}/`, {
        method: 'PATCH',
        body: changes,
      }),
    onSuccess: (community) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.detail(community.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.communities.list() });
    },
  });
}
