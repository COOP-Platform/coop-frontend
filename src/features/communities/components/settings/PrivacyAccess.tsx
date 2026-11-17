import { Badge, LoadingState, SectionCard } from '@/components/ui';
import { useWorkspace } from '@/features/auth';
import { PERMISSION_CATALOG, useCommittee, usePositions } from '@/features/positions';
import type { Position } from '@/features/positions';

/*
 * "Privacy & access": who can see and do what in this community, in words a
 * member with basic smartphone literacy can follow. Everything about
 * positions is read from the community's own positions, never assumed from
 * a position's name — two communities' "Treasurer" can hold different rights.
 *
 * The Platform Administrator part restates the backend's guarantees
 * (coop-backend platform_admin/catalog.py, docs/technical-decisions.md
 * "Platform Administrator is technical access only"). Keep it in step.
 */

/** Plain names for the permission groups. */
const AREA: Record<string, string> = {
  dashboard: 'Dashboard',
  community: 'Community profile',
  member: 'Members',
  position: 'Positions',
  meeting: 'Meetings',
  event: 'Events',
  announcement: 'Announcements',
  finance: 'Money',
  audit: 'Activity log',
};

const DESCRIPTION = new Map(PERMISSION_CATALOG.map((p) => [p.code, p]));

/** Permission codes as plain sentences, grouped by area. */
function inWords(codes: readonly string[]): { area: string; items: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const code of codes) {
    const known = DESCRIPTION.get(code);
    if (known === undefined) continue;
    const area = AREA[known.module] ?? known.module;
    groups.set(area, [...(groups.get(area) ?? []), known.description]);
  }
  return [...groups.entries()].map(([area, items]) => ({ area, items }));
}

/** The questions members asked, each answered from the positions' real rights. */
const SENSITIVE: readonly { code: string; what: string }[] = [
  {
    code: 'finance.contribution.view',
    what: "Everyone's contributions, not only their own",
  },
  { code: 'member.update', what: 'Change member records and categories' },
  { code: 'audit.view', what: 'The activity log of who did what' },
];

function PermissionList({ codes }: { codes: readonly string[] }) {
  const groups = inWords(codes);
  if (groups.length === 0) {
    return <p className="cs-text cs-muted">Member only.</p>;
  }
  return (
    <dl className="cs-rights">
      {groups.map((group) => (
        <div key={group.area} className="cs-rights__group">
          <dt className="cs-rights__area">{group.area}</dt>
          {group.items.map((item) => (
            <dd key={item} className="cs-rights__item">
              {item}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

function PositionCard({ position }: { position: Position }) {
  return (
    <li className="cs-position">
      <div className="cs-position__head">
        <h3 className="cs-position__name">
          {position.name}
          {position.is_admin && <Badge tone="info">Runs the community</Badge>}
        </h3>
        <span className="cs-muted">
          {position.holder_count === 0
            ? 'Vacant'
            : `${position.holder_count} ${position.holder_count === 1 ? 'person' : 'people'}`}
        </span>
      </div>
      {position.description && <p className="cs-text cs-muted">{position.description}</p>}
      <details className="cs-position__details">
        <summary>Rights</summary>
        <PermissionList codes={position.permissions} />
      </details>
    </li>
  );
}

export function PrivacyAccess() {
  const { communityId, membership, can, roleLabel } = useWorkspace();
  const canViewPositions = can('position.view');
  const positions = usePositions(communityId, canViewPositions);
  const committee = useCommittee(communityId, !canViewPositions);
  const list = positions.data ?? [];

  return (
    <div className="cs-privacy">
      <SectionCard title="Your access">
        <dl className="cs-facts cs-access">
          <div className="cs-fact">
            <dt className="cs-fact__label">Positions</dt>
            <dd className="cs-fact__value">{roleLabel}</dd>
          </div>
          <div className="cs-fact">
            <dt className="cs-fact__label">Category</dt>
            <dd className="cs-fact__value">{membership?.member_category.name ?? 'Not set'}</dd>
          </div>
        </dl>
        {membership?.status !== 'active' && (
          <p className="cs-text">
            Your membership is <strong>{membership?.status ?? 'not active'}</strong>: these rights
            are paused.
          </p>
        )}
        <PermissionList codes={membership?.permissions ?? []} />
      </SectionCard>

      <SectionCard
        title="Who sees what"
        footer="All members see the member list: names, emails, positions and status. Outsiders cannot."
      >
        {canViewPositions && positions.isPending ? (
          <LoadingState />
        ) : (
          <ul className="cs-who" role="list">
            {SENSITIVE.map((row) => {
              const holders = list.filter((p) => p.permissions.includes(row.code));
              return (
                <li key={row.code} className="cs-who__row">
                  <p className="cs-who__what">{row.what}</p>
                  <p className="cs-who__whom">
                    {canViewPositions
                      ? holders.length > 0
                        ? holders.map((p) => p.name).join(', ')
                        : 'No position'
                      : can(row.code)
                        ? 'You, and others whose position allows it'
                        : 'Only positions that allow it — not you'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={canViewPositions ? 'Positions' : 'Committee'}>
        {canViewPositions ? (
          positions.isPending ? (
            <LoadingState />
          ) : (
            <ul className="cs-positions" role="list">
              {list.map((position) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </ul>
          )
        ) : committee.isPending ? (
          <LoadingState />
        ) : (
          <ul className="cs-positions" role="list">
            {(committee.data ?? []).map((seat) => (
              <li key={seat.id} className="cs-position">
                <div className="cs-position__head">
                  <h3 className="cs-position__name">{seat.name}</h3>
                  <span className="cs-muted">
                    {seat.holders.length === 0
                      ? 'Vacant'
                      : seat.holders.map((h) => h.full_name).join(', ')}
                  </span>
                </div>
                {seat.description && <p className="cs-text cs-muted">{seat.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="COOP technical team">
        <div className="cs-platform">
          <div>
            <h3 className="cs-platform__title">
              <Badge tone="danger">Cannot</Badge>
            </h3>
            <ul className="cs-platform__list">
              <li>Join your community or hold any position in it.</li>
              <li>
                Approve, edit, add or remove anything inside your community — members, positions,
                meetings or money.
              </li>
              <li>
                See any money: no contributions, expenses, balances or amounts, even when helping
                with a problem.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="cs-platform__title">
              <Badge tone="success">Can</Badge>
            </h3>
            <ul className="cs-platform__list">
              <li>See that your community exists: its name, type, status and number of members.</li>
              <li>
                When fixing a problem, look (only look) at your community profile, the member list
                with positions, and whether invitation emails were sent.
              </li>
              <li>
                Every such look is written to your community&apos;s activity log first: who looked,
                when, what and why. A reason is required.
              </li>
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
