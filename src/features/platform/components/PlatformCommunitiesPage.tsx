import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';

import {
  Badge,
  EmptyState,
  ErrorState,
  IconCommunity,
  IconEye,
  IconHistory,
  IconSearch,
  LoadingState,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { errorMessage } from '@/lib/api/errors';
import { formatDate } from '@/lib/format/date';

import { usePlatformCommunities } from '../api/platform';
import type { DirectoryCommunity } from '../api/platform';
import { typeLabel } from '../labels';
import { PlatformHeader } from './PlatformHeader';

const STATUS: Record<DirectoryCommunity['status'], { label: string; tone: BadgeTone }> = {
  active: { label: 'Active', tone: 'success' },
  suspended: { label: 'Suspended', tone: 'warning' },
  archived: { label: 'Archived', tone: 'neutral' },
};

/** `/platform/communities`: find the community a support request is about. */
export function PlatformCommunitiesPage() {
  const communities = usePlatformCommunities();
  const [search, setSearch] = useState('');
  const searchId = useId();

  if (communities.isPending) {
    return <LoadingState label="Loading communities…" />;
  }
  if (communities.isError) {
    return (
      <ErrorState title="Could not load communities" message={errorMessage(communities.error)} />
    );
  }

  const query = search.trim().toLowerCase();
  const rows = communities.data.filter(
    (c) =>
      query === '' ||
      c.name.toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query) ||
      typeLabel(c.type).toLowerCase().includes(query),
  );

  return (
    <div className="page">
      <PlatformHeader
        title="Communities"
        subtitle="Name, type, status and size — enough to find the community a request is about. Members' details are only in the read-only support view, and opening it is logged."
      />

      <div className="toolbar card">
        <div className="search-field">
          <label htmlFor={searchId} className="visually-hidden">
            Search communities
          </label>
          <span className="search-field__icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            id={searchId}
            type="search"
            className="search-field__input"
            placeholder="Search by name or type..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <section className="card table-card" aria-labelledby="platform-communities-title">
        <header className="table-card__head">
          <h2 id="platform-communities-title" className="section-head__title">
            All communities
          </h2>
          <p className="section-head__subtitle">Member counts include active members only.</p>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            icon={<IconCommunity width={28} height={28} />}
            title={communities.data.length === 0 ? 'No communities yet' : 'No matches'}
            message={
              communities.data.length === 0
                ? 'Communities appear here as soon as someone founds one.'
                : 'No community matches that search.'
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Community</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="platform-num">
                    Members
                  </th>
                  <th scope="col">Founded on the platform</th>
                  <th scope="col" className="table__action-col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((community) => (
                  <tr key={community.id}>
                    <td>
                      <span className="table__stack">
                        <span className="table__name">{community.name}</span>
                        <span className="table__muted">{typeLabel(community.type)}</span>
                      </span>
                    </td>
                    <td>
                      <Badge tone={STATUS[community.status].tone}>
                        {STATUS[community.status].label}
                      </Badge>
                    </td>
                    <td className="platform-num">{community.member_count}</td>
                    <td>{formatDate(community.created_at)}</td>
                    <td className="table__action-col">
                      <span className="platform-actions">
                        <Link
                          to="/platform/communities/$communityId"
                          params={{ communityId: community.id }}
                          className="link-action"
                        >
                          <IconEye width={16} height={16} aria-hidden="true" />
                          Support view
                        </Link>
                        <Link
                          to="/platform/audit-log"
                          search={{ community: community.id }}
                          className="link-action"
                        >
                          <IconHistory width={16} height={16} aria-hidden="true" />
                          Audit log
                        </Link>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="table-footer">
          <p className="table-footer__summary">
            Showing <strong>{rows.length}</strong> of <strong>{communities.data.length}</strong>{' '}
            communities
          </p>
        </footer>
      </section>
    </div>
  );
}
