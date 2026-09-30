import { createFileRoute } from '@tanstack/react-router';

import { InviteMember } from '@/features/members';

export const Route = createFileRoute('/community/invitations/new')({
  component: InviteMember,
});
