import { useNavigate } from '@tanstack/react-router';
import { useId } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  IconAward,
  IconChevronRight,
  IconClipboardClock,
  IconDownload,
  IconMail,
  IconSearch,
  IconShieldCheck,
  IconUserPlus,
  IconUsers,
  LoadingState,
  PAGE_SIZE,
  PageHeader,
  SectionCard,
  Select,
  StatCard,
  TableFooter,
} from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { useCommittee, usePositions } from '@/features/positions';
import { errorMessage } from '@/lib/api/errors';
import { downloadCsv } from '@/lib/csv';
import { isPlainMemberPosition, positionTone } from '@/lib/position-tone';
import { PositionIcon } from '@/lib/positions';

import type { DirectoryMember } from '../api/directory';
import { useMemberDirectory } from '../api/directory';
import { useMemberCategories } from '../api/member-categories';
import { MemberPanel } from './MemberProfile';
import type { MembersSearch, MemberStatusFilter } from '../search';

/** `role` value for members holding no position at all. */
const NO_POSITION = 'none';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
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
  // For now only admins open member profiles from here. Everyone else gets
  // a three-column list -- name, position, status -- and reaches their own
  // profile from the account menu.
  const isAdmin = membership?.is_admin === true;
  const directory = useMemberDirectory();
  // Without position.view the directory cannot say who holds what; the
  // committee endpoint (open to every member) can, for the officer seats.
  const committee = useCommittee(communityId, !can('position.view'));
  const seatsByMember = new Map<string, string[]>();
  for (const seat of committee.data ?? []) {
    for (const holder of seat.holders) {
      seatsByMember.set(holder.membership_id, [
        ...(seatsByMember.get(holder.membership_id) ?? []),
        seat.name,
      ]);
    }
  }
  const positions = usePositions(communityId, can('position.view'));
  // Contribution category per member (S1-17): memberships carry only its id.
  const categories = useMemberCategories(communityId);
  const categoryName = new Map((categories.data ?? []).map((c) => [c.id, c.name]));

  const members = directory.members;
  const status: MemberStatusFilter = search.status ?? 'all';
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
      ['Name', 'Email', 'Positions', 'Contribution category', 'Status', 'Joined'],
      filtered.map((m) => [
        m.fullName,
        m.email ?? '',
        m.positions.map((p) => p.name).join('; '),
        categoryName.get(m.categoryId) ?? '',
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
  const invitedCount = members.filter((m) => m.status === 'invited').length;
  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  return (
    <div className="page">
      <PageHeader
        title="Members"
        subtitle={`${members.length} total`}
        actions={
          can('member.invite') && (
            <Button
              inline
              icon={<IconUserPlus />}
              onClick={() =>
                void navigate({ to: '/community/invitations', search: { invite: true } })
              }
            >
              Invite Member
            </Button>
          )
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Active"
          value={activeCount}
          caption="In good standing"
          icon={<IconShieldCheck />}
          tone="brand"
        />
        <StatCard
          label="Officers"
          value={directory.positionsPending ? '…' : officerCount}
          caption="Hold a position"
          icon={<IconAward />}
          tone="info"
        />
        <StatCard
          label="Invited"
          value={invitedCount}
          caption="Not yet joined"
          icon={<IconMail />}
          tone="accent"
        />
        <StatCard
          label="Suspended"
          value={reviewCount}
          caption="Need review"
          icon={<IconClipboardClock />}
          tone="warning"
          emphasis={reviewCount > 0}
        />
      </div>

      <SectionCard
        title="Member list"
        flush
        actions={
          <>
            <div className="search-field search-field--compact">
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
                placeholder="Search…"
                value={search.q ?? ''}
                onChange={(event) => update({ q: event.target.value || undefined })}
              />
            </div>

            <Select
              label="Filter by status"
              labelHidden
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => {
                const value = event.target.value as MemberStatusFilter;
                update({ status: value === 'all' ? undefined : value });
              }}
            />

            {positions.data && (
              <Select
                label="Filter by position"
                labelHidden
                options={[
                  { value: '', label: 'All positions' },
                  ...positions.data.map((p) => ({ value: p.id, label: p.name })),
                  { value: NO_POSITION, label: 'No position' },
                ]}
                value={search.role ?? ''}
                onChange={(event) => update({ role: event.target.value || undefined })}
              />
            )}

            {/* Exporting the roster is an admin task; members only read the list. */}
            {isAdmin && (
              <button
                type="button"
                className="toolbar__button toolbar__button--icon"
                aria-label="Export members as CSV"
                title="Export CSV"
                onClick={exportCsv}
              >
                <IconDownload width={18} height={18} />
              </button>
            )}
          </>
        }
        footer={
          <TableFooter
            from={from}
            to={from === 0 ? 0 : from + visible.length - 1}
            total={filtered.length}
            page={page}
            pageCount={pageCount}
            onPage={(n) => onSearchChange({ ...search, page: n })}
          />
        }
      >
        {directory.isPending ? (
          <LoadingState label="Loading members…" />
        ) : directory.error ? (
          <ErrorState message={errorMessage(directory.error)} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<IconUsers width={28} height={28} />}
            title="No matches"
            action={
              <Button variant="tint" inline onClick={() => onSearchChange({})}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="table-scroll">
            <table className={isAdmin ? 'table' : 'table table--roster'}>
              {!isAdmin && (
                <colgroup>
                  <col className="table--roster__member" />
                  <col className="table--roster__position" />
                  <col className="table--roster__category" />
                  <col className="table--roster__status" />
                </colgroup>
              )}
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Position</th>
                  <th scope="col">Category</th>
                  <th scope="col" className={isAdmin ? undefined : 'table__status-col'}>
                    Status
                  </th>
                  {isAdmin && (
                    <th scope="col" className="table__action-col">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => (
                  <MemberRow
                    onOpen={() => onSearchChange({ ...search, selected: member.membershipId })}
                    key={member.membershipId}
                    member={member}
                    category={categoryName.get(member.categoryId)}
                    showActions={isAdmin}
                    committeeSeats={
                      member.positionsKnown
                        ? undefined
                        : (seatsByMember.get(member.membershipId) ?? [])
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Drawer
        open={search.selected !== undefined}
        onClose={() => onSearchChange({ ...search, selected: undefined })}
        label="Member details"
      >
        {search.selected && <MemberPanel memberId={search.selected} />}
      </Drawer>
    </div>
  );
}

function MemberRow({
  onOpen,
  member,
  category,
  showActions,
  committeeSeats,
}: {
  onOpen: () => void;
  member: DirectoryMember;
  /** The contribution category's name; undefined while loading or unknown. */
  category: string | undefined;
  showActions: boolean;
  /** Seat names from the committee, when the member's own positions are not readable. */
  committeeSeats?: readonly string[];
}) {
  const badges =
    committeeSeats !== undefined
      ? committeeSeats.map((name) => ({ id: name, name }))
      : member.positions.filter((p) => !isPlainMemberPosition(p.name));
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
        {!member.positionsKnown && committeeSeats === undefined ? (
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
          <span className="table__muted">
            {committeeSeats !== undefined ? 'Member' : (plain?.name ?? 'No position')}
          </span>
        )}
      </td>
      <td>
        {category ? (
          <span className="table__muted">{category}</span>
        ) : (
          <span className="table__muted">—</span>
        )}
      </td>
      <td className={showActions ? undefined : 'table__status-col'}>
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
      {showActions && (
        <td className="table__action-col">
          <button
            type="button"
            className="link-button"
            aria-label={`View details for ${member.fullName}`}
            onClick={onOpen}
          >
            View
            <IconChevronRight width={16} height={16} aria-hidden="true" />
          </button>
        </td>
      )}
    </tr>
  );
}
