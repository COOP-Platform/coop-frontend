/**
 * Shared domain types.
 *
 * Sprint 1 covers Community Management and Member Management, so those two
 * entities are sketched here as placeholders. Replace them with the real
 * shapes once Jean Claude's API contract / ERD is final — keep this file as
 * the single place the frontend agrees with the backend.
 */

export type ID = string;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// TODO(Sprint 1): confirm against the ERD.
export interface Community {
  id: ID;
  name: string;
  description?: string;
  createdAt: string;
}

// TODO(Sprint 1): confirm against the ERD.
export interface Member {
  id: ID;
  communityId: ID;
  fullName: string;
  email: string;
  status: 'invited' | 'pending' | 'active' | 'suspended';
  joinedAt?: string;
}
