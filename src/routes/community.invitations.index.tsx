import { createFileRoute } from '@tanstack/react-router';

import type { InvitationsSearch } from '@/features/members';
import { InvitationsBoard, parseInvitationsSearch } from '@/features/members';

export const Route = createFileRoute('/community/invitations/')({
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
