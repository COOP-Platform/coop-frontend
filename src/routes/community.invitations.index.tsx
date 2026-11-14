import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/features/auth';
import type { InvitationsSearch } from '@/features/members';
import { InvitationsBoard, parseInvitationsSearch } from '@/features/members';

export const Route = createFileRoute('/community/invitations/')({
  // Without `member.invite` the sidebar hides Invitations; a typed URL lands
  // on the dashboard instead of a page whose every request is refused.
  beforeLoad: requirePermission('member.invite', '/community'),
  validateSearch: parseInvitationsSearch,
  component: InvitationsPage,
});

function InvitationsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <InvitationsBoard
      search={search}
      onSearchChange={(next: InvitationsSearch) => void navigate({ search: next, replace: true })}
    />
  );
}
