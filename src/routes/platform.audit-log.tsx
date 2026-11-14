import { createFileRoute } from '@tanstack/react-router';

import { parseAuditLogSearch, PlatformAuditLogPage } from '@/features/platform';
import type { AuditLogSearch } from '@/features/platform';

export const Route = createFileRoute('/platform/audit-log')({
  validateSearch: parseAuditLogSearch,
  component: AuditLogPage,
});

function AuditLogPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <PlatformAuditLogPage
      search={search}
      onSearchChange={(next: AuditLogSearch) => void navigate({ search: next })}
    />
  );
}
