import type { ReactNode } from 'react';

import {
  Badge,
  IconCheckCircle,
  IconEye,
  IconLock,
  IconShieldCheck,
  IconTile,
  IconUsers,
  LoadingState,
} from '@/components/ui';
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

function Section({
  icon,
  title,
  lede,
  children,
}: {
  icon: ReactNode;
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="card cs-privacy__section">
      <header className="section-head">
        <IconTile tone="info" size="lg">
          {icon}
        </IconTile>
        <div className="section-head__text">
          <h2 className="section-head__title">{title}</h2>
          {lede && <p className="section-head__subtitle">{lede}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function PermissionList({ codes }: { codes: readonly string[] }) {
  const groups = inWords(codes);
  if (groups.length === 0) {
    return <p className="cs-text cs-muted">Nothing beyond being listed as a member.</p>;
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
        <h3 className="cs-position__name">{position.name}</h3>
        <span className="cs-muted">
          {position.holder_count === 0
            ? 'Nobody holds it'
            : `${position.holder_count} ${position.holder_count === 1 ? 'person' : 'people'}`}
        </span>
      </div>
      {position.description && <p className="cs-text cs-muted">{position.description}</p>}
      {position.is_admin && (
        <p className="cs-text">
          <strong>Runs the community:</strong> can do everything below, including deciding who holds
          which position.
        </p>
      )}
      <details className="cs-position__details">
        <summary>What this position can see and do</summary>
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
      <div className="notice notice--info" role="note">
        <IconShieldCheck />
        <div>
          <p className="notice__title">Rights come from positions, not titles</p>
          <p className="notice__text">
            What anyone can see or do here depends on the positions they hold in this community, and
            the community decides what each position allows. The platform checks these rights every
            time — hiding a button is not what protects your data.
          </p>
        </div>
      </div>

      <Section
        icon={<IconUsers />}
        title="Your access"
        lede={`You hold: ${roleLabel}. Contribution category: ${membership?.member_category.name ?? 'not set'}.`}
      >
        {membership?.status !== 'active' && (
          <p className="cs-text">
            Your membership is <strong>{membership?.status ?? 'not active'}</strong>, so you cannot
            use any of these rights until it is active again.
          </p>
        )}
        <PermissionList codes={membership?.permissions ?? []} />
      </Section>

      <Section
        icon={<IconEye />}
        title="Who can see your personal details"
        lede="Answered from the rights your community has given each position."
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
        <p className="cs-text cs-muted">
          Every member of this community can see the member list: names, email addresses, positions
          and membership status. People outside the community cannot. Your own contributions,
          positions and profile are always visible to you.
        </p>
      </Section>

      <Section
        icon={<IconCheckCircle />}
        title="Positions in this community"
        lede={
          canViewPositions
            ? 'Open a position to see, in plain words, what it can see and do.'
            : 'The committee seats and who holds them.'
        }
      >
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
          <>
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
            <p className="cs-text cs-muted">
              The full list of what each position allows is shown to those who manage positions. Ask
              your committee if you want to know.
            </p>
          </>
        )}
      </Section>

      <Section
        icon={<IconLock />}
        title="The COOP technical team (Platform Administrators)"
        lede="The people who keep the platform running. They are not part of your community."
      >
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
                when, what and why. A reason is required. Showing this log to your committee in the
                app is coming later.
              </li>
            </ul>
          </div>
        </div>
      </Section>
    </div>
  );
}
