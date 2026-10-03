import { createFileRoute } from '@tanstack/react-router';

import type { MembersSearch } from '@/features/members';
import { MembersDirectory, parseMembersSearch } from '@/features/members';

export const Route = createFileRoute('/community/members/')({
  validateSearch: parseMembersSearch,
  component: MembersPage,
});

function MembersPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <MembersDirectory
      search={search}
      // Replace, not push: typing in the search box should not fill history.
      onSearchChange={(next: MembersSearch) => void navigate({ search: next, replace: true })}
    />
  );
}
