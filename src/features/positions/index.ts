// Public surface of the Positions module (governance roles).
export { PositionsBoard } from './components/PositionsBoard';
export { PositionDetails } from './components/PositionDetails';
export {
  usePositions,
  useCommittee,
  useMembersPositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
  useAssignPosition,
  useRevokePosition,
} from './api/positions';
export type { Position, PositionInput, MemberPositions, CommitteeSeat } from './api/positions';
export { PERMISSION_CATALOG, PERMISSION_MODULES, MEMBER_BASELINE } from './data/permissions';
export type { PermissionDefinition } from './data/permissions';
