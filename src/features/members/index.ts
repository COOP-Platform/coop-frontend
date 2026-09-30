// Public surface of the Members module.
//
// Screens: the directory, a member's profile, and invitations (list + invite),
// all on the live API. Where the API does not carry what a design shows, see
// docs/sprint-2-integration.md.
export { MembersDirectory } from './components/MembersDirectory';
export { MemberProfile } from './components/MemberProfile';
export { InvitationsBoard } from './components/InvitationsBoard';
export { InviteMember } from './components/InviteMember';

export { parseInvitationsSearch, parseMembersSearch } from './search';
export type { InvitationsSearch, MembersSearch } from './search';

export { useMemberDirectory } from './api/directory';
export type { DirectoryMember } from './api/directory';

export {
  effectiveStatus,
  useInvitations,
  useSendInvitation,
  useRevokeInvitation,
  useResendInvitation,
} from './api/invitations';
export type { Invitation, InvitationStatus, SendInvitationInput } from './api/invitations';

export { useLeaveCommunity, useMemberLifecycle } from './api/lifecycle';
export type { LifecycleAction, MembershipLifecycle } from './api/lifecycle';

export { useMemberCategories } from './api/member-categories';
export type { MemberCategory } from './api/member-categories';

export { useMemberships } from './api/memberships';
export type { Membership, MembershipStatus } from './api/memberships';
