import { Link } from '@tanstack/react-router';
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { Badge, IconArrowRight, IconTile, IconUserCog } from '@/components/ui';
import { APPS, FINANCE_APP, MEETINGS_APP } from '@/config/apps';
import type { AppDefinition } from '@/config/apps';

/*
 * Dashboard sections keyed on the member's resolved permissions from /me
 * (S2-11) — never on a position's name. Rename "Treasurer", or change what it
 * allows, and the sections follow without a frontend change.
 */

/** The permission codes an app's own sidebar is gated on. */
function appPermissions(app: AppDefinition): string[] {
  return app.nav.flatMap((item) => (item.permission ? [item.permission] : []));
}

/** Rights that make someone a manager of members or positions. */
const MANAGE_PEOPLE = [
  'member.invite',
  'member.update',
  'member.suspend',
  'member.remove',
  'position.create',
  'position.update',
  'position.assign',
];

interface Section {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  to: LinkProps['to'];
  cta: string;
}

export function AppSections({ can }: { can: (permission: string) => boolean }) {
  const sections: Section[] = [];

  if (MANAGE_PEOPLE.some(can)) {
    sections.push({
      id: 'people',
      title: 'Members & positions',
      description: 'Invite people, keep member records and decide who holds which position.',
      icon: <IconUserCog />,
      to: can('position.view') ? '/community/positions' : '/community/members',
      cta: 'Manage',
    });
  }
  for (const app of [FINANCE_APP, MEETINGS_APP]) {
    if (app.to !== undefined && appPermissions(app).some(can)) {
      sections.push({
        id: app.id,
        title: app.name,
        description: app.description,
        icon: app.icon,
        to: app.to,
        cta: `Open ${app.name}`,
      });
    }
  }

  const planned = APPS.filter((app) => app.to === undefined);

  return (
    <>
      {sections.length > 0 && (
        <section aria-labelledby="dash-areas-title" className="dash-areas">
          <h2 id="dash-areas-title" className="section-title">
            Your areas
          </h2>
          <ul className="dash-cards" role="list">
            {sections.map((section) => (
              <li key={section.id} className="card dash-card">
                <IconTile tone="brand" size="lg">
                  {section.icon}
                </IconTile>
                <div className="dash-card__body">
                  <h3 className="dash-card__title">{section.title}</h3>
                  <p className="dash-card__text">{section.description}</p>
                </div>
                <Link to={section.to} className="dash-link">
                  {section.cta}
                  <IconArrowRight />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {planned.length > 0 && (
        <section aria-labelledby="dash-later-title" className="dash-areas">
          <h2 id="dash-later-title" className="section-title">
            Coming later
          </h2>
          <ul className="dash-cards dash-cards--small" role="list">
            {planned.map((app) => (
              <li key={app.id} className="card dash-card dash-card--planned">
                <IconTile tone="neutral">{app.icon}</IconTile>
                <div className="dash-card__body">
                  <h3 className="dash-card__title">
                    {app.name} <Badge tone="neutral">Coming later</Badge>
                  </h3>
                  <p className="dash-card__text">{app.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
