import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  Button,
  EmptyState,
  ErrorState,
  IconFilter,
  IconHistory,
  Input,
  LoadingState,
  SectionCard,
  Select,
  TableFooter,
} from '@/components/ui';
import type { SelectOption } from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';

import { SUPPORT_READ_ACTION, usePlatformAuditLog, usePlatformCommunities } from '../api/platform';
import { formatDateTime } from '../labels';
import type { AuditLogSearch } from '../search';
import { PlatformHeader } from './PlatformHeader';

const PAGE_SIZE = 25;

interface PlatformAuditLogPageProps {
  search: AuditLogSearch;
  onSearchChange: (next: AuditLogSearch) => void;
}

/** `/platform/audit-log`: who did what, when and from where, across every community. */
export function PlatformAuditLogPage({ search, onSearchChange }: PlatformAuditLogPageProps) {
  const page = search.page ?? 1;
  const log = usePlatformAuditLog({
    page,
    pageSize: PAGE_SIZE,
    community: search.community,
    action: search.action,
  });
  const communities = usePlatformCommunities();

  // The action box applies on submit, not per keystroke: it is an exact match.
  const [actionDraft, setActionDraft] = useState(search.action ?? '');
  useEffect(() => setActionDraft(search.action ?? ''), [search.action]);

  const communityOptions: SelectOption[] = [
    { value: '', label: 'All communities' },
    ...(communities.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  // A community linked to before the directory has loaded still shows as chosen.
  if (search.community && !communityOptions.some((o) => o.value === search.community)) {
    communityOptions.push({ value: search.community, label: 'Selected community' });
  }

  function applyAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = actionDraft.trim();
    onSearchChange({ ...search, action: action === '' ? undefined : action, page: undefined });
  }

  const filtered = search.community !== undefined || search.action !== undefined;

  const filters = (
    <form className="platform-filters" onSubmit={applyAction}>
      <Select
        label="Community"
        labelHidden
        options={communityOptions}
        value={search.community ?? ''}
        onChange={(event) =>
          onSearchChange({
            ...search,
            community: event.target.value === '' ? undefined : event.target.value,
            page: undefined,
          })
        }
      />
      <Input
        label="Action (exact name)"
        labelHidden
        placeholder="Action, e.g. contribution.confirmed"
        value={actionDraft}
        onChange={(event) => setActionDraft(event.target.value)}
      />
      <Button type="submit" variant="secondary" inline icon={<IconFilter />}>
        Apply
      </Button>
      <Button
        variant="secondary"
        inline
        onClick={() => onSearchChange({ ...search, action: SUPPORT_READ_ACTION, page: undefined })}
      >
        Support looks only
      </Button>
      {filtered && (
        <Button variant="secondary" inline onClick={() => onSearchChange({})}>
          Clear filters
        </Button>
      )}
    </form>
  );

  const footer = log.data ? (
    <TableFooter
      from={log.data.items.length === 0 ? 0 : (page - 1) * log.data.page_size + 1}
      to={(page - 1) * log.data.page_size + log.data.items.length}
      total={log.data.total}
      page={page}
      pageCount={Math.max(1, Math.ceil(log.data.total / log.data.page_size))}
      onPage={(next) => onSearchChange({ ...search, page: next === 1 ? undefined : next })}
    />
  ) : undefined;

  return (
    <div className="page">
      <PlatformHeader title="Audit log" />

      <SectionCard title="Entries" actions={filters} flush footer={footer}>
        {log.isPending ? (
          <LoadingState label="Loading the audit log…" />
        ) : log.isError ? (
          <ErrorState title="Could not load the audit log" message={errorMessage(log.error)} />
        ) : log.data.items.length === 0 ? (
          <EmptyState
            icon={<IconHistory width={28} height={28} />}
            title={filtered ? 'No matches' : 'No entries'}
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Action</th>
                  <th scope="col">Community</th>
                  <th scope="col">Who</th>
                  <th scope="col">From</th>
                </tr>
              </thead>
              <tbody>
                {log.data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="platform-nowrap">{formatDateTime(entry.created_at)}</td>
                    <td>
                      <span className="table__stack">
                        <span className="table__name mono">{entry.action}</span>
                        <span className="table__muted">
                          {entry.entity_type} · {entry.entity_id.slice(0, 8)}
                        </span>
                      </span>
                    </td>
                    <td>
                      {entry.community ? (
                        <button
                          type="button"
                          className="link-action"
                          onClick={() =>
                            onSearchChange({
                              ...search,
                              community: entry.community?.id,
                              page: undefined,
                            })
                          }
                        >
                          {entry.community.name}
                        </button>
                      ) : (
                        <span className="table__muted">Platform</span>
                      )}
                    </td>
                    <td>
                      {entry.actor ? (
                        <span className="table__stack">
                          <span>{entry.actor.full_name}</span>
                          <span className="table__muted">{entry.actor.email}</span>
                        </span>
                      ) : (
                        <span className="table__muted">System</span>
                      )}
                    </td>
                    <td className="mono">{entry.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
