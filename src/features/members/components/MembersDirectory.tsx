import { Link, useNavigate } from '@tanstack/react-router';
import { useId } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  IconAward,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardClock,
  IconDownload,
  IconFilter,
  IconSearch,
  IconShieldCheck,
  IconUserPlus,
  IconUsers,
  LoadingState,
  PageHeader,
  SegmentedControl,
  StatCard,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { usePositions } from '@/features/positions';
import { errorMessage } from '@/lib/api/errors';
import { downloadCsv } from '@/lib/csv';
import { isPlainMemberPosition, positionTone } from '@/lib/position-tone';
import { PositionIcon } from '@/lib/positions';

import type { DirectoryMember } from '../api/directory';
import { useMemberDirectory } from '../api/directory';
import type { MembersSearch, MemberStatusFilter } from '../search';

const PAGE_SIZE = 8;
/** `role` value for members holding no position at all. */
const NO_POSITION = 'none';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Members' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
] as const;

interface MembersDirectoryProps {
  search: MembersSearch;
  onSearchChange: (next: MembersSearch) => void;
}

export function MembersDirectory({ search, onSearchChange }: MembersDirectoryProps) {
  const navigate = useNavigate();
  const searchId = useId();
  const { membership, communityId, can } = useWorkspace();
  const directory = useMemberDirectory();
  const positions = usePositions(communityId, can('position.view'));

  const members = directory.members;
  const status: MemberStatusFilter = search.status ?? 'all';
  const role = positions.data?.find((p) => p.id === search.role);
  const roleLabel = search.role === NO_POSITION ? 'No position' : (role?.name ?? 'All');
  const query = (search.q ?? '').trim().toLowerCase();

  const filtered = members.filter(
    (m) =>
      (status === 'all' || m.status === status) &&
      (search.role === undefined ||
        (search.role === NO_POSITION
          ? m.positionsKnown && m.positions.length === 0
          : m.positions.some((p) => p.id === search.role))) &&
      (query === '' ||
        m.fullName.toLowerCase().includes(query) ||
        (m.email ?? '').toLowerCase().includes(query)),
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(search.page ?? 1, pageCount);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Filters reset pagination; changing page keeps the filters.
  function update(next: Partial<MembersSearch>) {
    onSearchChange({ ...search, page: undefined, ...next });
  }

  function exportCsv() {
    downloadCsv(
      `${membership?.community.slug ?? 'community'}-members.csv`,
      ['Name', 'Email', 'Positions', 'Status', 'Joined'],
      filtered.map((m) => [
        m.fullName,
        m.email ?? '',
        m.positions.map((p) => p.name).join('; '),
        m.status,
        m.joinDate ?? '',
      ]),
    );
  }

  const activeCount = members.filter((m) => m.status === 'active').length;
  const officerCount = members.filter((m) =>
    m.positions.some((p) => !isPlainMemberPosition(p.name)),
  ).length;
  const reviewCount = members.filter((m) => m.status === 'suspended').length;

  return (
    <div className="page">
      <PageHeader
        title="Members"
        badge={<Badge tone="info">{members.length} Total</Badge>}
        subtitle={`View and manage registered members of ${membership?.community.name ?? 'your'} community.`}
        actions={
          can('member.invite') && (
            <Button
              inline
              icon={<IconUserPlus />}
              onClick={() => void navigate({ to: '/community/invitations/new' })}
            >
              Invite Member
            </Button>
          )
        }
      />

      <div className="stat-grid">
        <StatCard
          variant="tint"
          label="Active Roster"
          value={activeCount}
          icon={<IconShieldCheck />}
          tone="brand"
        />
        <StatCard
          variant="tint"
          label="Executive Officers"
          value={directory.positionsPending ? '…' : officerCount}
          icon={<IconAward />}
          tone="info"
        />
        <StatCard
          variant="tint"
          label="Requires Review"
          value={reviewCount}
          icon={<IconClipboardClock />}
          tone="warning"
          emphasis
        />
      </div>

      <div className="toolbar card">
        <div className="search-field">
          <label htmlFor={searchId} className="visually-hidden">
            Search member by name or email
          </label>
          <span className="search-field__icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            id={searchId}
            type="search"
            className="search-field__input"
            placeholder="Search member by name..."
            value={search.q ?? ''}
            onChange={(event) => update({ q: event.target.value || undefined })}
          />
        </div>

        <div className="toolbar__controls">
          <SegmentedControl
            label="Filter by status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(value) => update({ status: value === 'all' ? undefined : value })}
          />

          {positions.data && (
            <Dropdown
              align="end"
              chevron={false}
              triggerClassName="toolbar__button"
              label={`Filter by position, currently ${roleLabel}`}
              trigger={
                <>
                  <IconFilter width={16} height={16} />
                  Role: {roleLabel}
                </>
              }
            >
              {(close) => (
                <div className="menu">
                  <p className="menu__heading">Filter by position</p>
                  {[
                    { id: undefined, name: 'All positions' },
                    ...positions.data.map((p) => ({ id: p.id, name: p.name })),
                    { id: NO_POSITION, name: 'No position' },
                  ].map((option) => (
                    <button
                      key={option.id ?? 'all'}
                      type="button"
                      className="menu__item"
                      aria-current={option.id === search.role ? 'true' : undefined}
                      onClick={() => {
                        update({ role: option.id });
                        close();
                      }}
                    >
                      <span className="menu__item-title">{option.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>
          )}

          <button
            type="button"
            className="toolbar__button toolbar__button--icon"
            aria-label="Export members as CSV"
            title="Export CSV"
            onClick={exportCsv}
          >
            <IconDownload width={18} height={18} />
          </button>
        </div>
      </div>

      <section className="card table-card" aria-label="Members">
        {directory.isPending ? (
          <LoadingState label="Loading members…" />
        ) : directory.error ? (
          <ErrorState message={errorMessage(directory.error)} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconUsers width={28} height={28} />}
            title="No members match these filters"
            message="Try another name, or clear the status and role filters."
            action={
              <Button variant="tint" inline onClick={() => onSearchChange({})}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Position</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="table__action-col">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => (
                  <MemberRow key={member.membershipId} member={member} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="table-footer">
          <p className="table-footer__summary">
            Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong> members
          </p>
          {pageCount > 1 && (
            <nav className="pagination" aria-label="Pagination">
              <button
                type="button"
                className="pagination__step"
                disabled={page === 1}
                onClick={() => onSearchChange({ ...search, page: page - 1 })}
              >
                <IconChevronLeft width={16} height={16} />
                Previous
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="pagination__page"
                  aria-current={n === page ? 'page' : undefined}
                  aria-label={`Page ${n}`}
                  onClick={() => onSearchChange({ ...search, page: n })}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="pagination__step"
                disabled={page === pageCount}
                onClick={() => onSearchChange({ ...search, page: page + 1 })}
              >
                Next
                <IconChevronRight width={16} height={16} />
              </button>
            </nav>
          )}
        </footer>
      </section>
    </div>
  );
}

function MemberRow({ member }: { member: DirectoryMember }) {
  const badges = member.positions.filter((p) => !isPlainMemberPosition(p.name));
  const plain = member.positions.find((p) => isPlainMemberPosition(p.name));

  return (
    <tr>
      <td>
        <span className="table__person">
          <Avatar name={member.fullName} tone={member.isYou ? 'brand' : undefined} />
          <span className="table__stack">
            <span className="table__name">
              {member.fullName}
              {member.isYou && <span className="table__muted"> (you)</span>}
            </span>
            {member.email && <span className="table__muted">{member.email}</span>}
          </span>
        </span>
      </td>
      <td>
        {!member.positionsKnown ? (
          <span className="table__muted">—</span>
        ) : badges.length > 0 ? (
          <span className="badge-row">
            {badges.map((position) => (
              <Badge
                key={position.id}
                tone={positionTone(position.name)}
                icon={<PositionIcon name={position.name} width={14} height={14} />}
              >
                {position.name}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="table__muted">{plain?.name ?? 'No position'}</span>
        )}
      </td>
      <td>
        {member.status === 'active' ? (
          <Badge tone="success" dot>
            Active
          </Badge>
        ) : member.status === 'suspended' ? (
          <Badge tone="warning" dot>
            Suspended
          </Badge>
        ) : (
          <Badge tone="neutral" dot>
            Invited
          </Badge>
        )}
      </td>
      <td className="table__action-col">
        <Link
          to="/community/members/$memberId"
          params={{ memberId: member.membershipId }}
          className="link-button"
          aria-label={`View details for ${member.fullName}`}
        >
          View Details
        </Link>
      </td>
    </tr>
  );
}
