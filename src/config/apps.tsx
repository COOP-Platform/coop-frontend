/*
 * The product is split into apps, picked from the top bar's app switcher.
 * Each app owns a URL prefix and a sidebar. Adding an app is: register it
 * here, add its layout route (see routes/community.tsx), and list its pages
 * in `nav`.
 */
import type { LinkProps } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import {
  IconBanknote,
  IconBarChart,
  IconCalendar,
  IconChat,
  IconCheckSquare,
  IconCommunity,
  IconFile,
  IconGrid,
  IconIdBadge,
  IconMail,
  IconFlag,
  IconSend,
  IconUsers,
  IconWallet,
} from '@/components/ui';

export interface AppNavItem {
  label: string;
  icon: ReactNode;
  to: LinkProps['to'];
  /** Only match the exact path (the app's index page). */
  exact?: boolean;
  /** Hidden from members who do not hold this permission. */
  permission?: string;
}

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  /** Where the switcher sends you. Absent while the app is not built yet. */
  to?: LinkProps['to'];
  nav: readonly AppNavItem[];
}

export const COMMUNITY_APP: AppDefinition = {
  id: 'community',
  name: 'Community',
  description: 'Members, positions and invitations',
  icon: <IconCommunity />,
  to: '/community',
  nav: [
    { label: 'Dashboard', icon: <IconGrid />, to: '/community', exact: true },
    { label: 'Members', icon: <IconUsers />, to: '/community/members' },
    { label: 'Positions', icon: <IconIdBadge />, to: '/community/positions' },
    {
      label: 'Invitations',
      icon: <IconMail />,
      to: '/community/invitations',
      permission: 'member.invite',
    },
    { label: 'Reports', icon: <IconFile />, to: '/community/reports' },
  ],
};

/*
 * Money in and out of the community. Pages a member has no use for carry the
 * permission that unlocks them; the sidebar leaves them out otherwise. The
 * backend still enforces every one of these.
 */
export const FINANCE_APP: AppDefinition = {
  id: 'finance',
  name: 'Finance',
  description: 'Contributions, expenses, income, budgets and reports',
  icon: <IconWallet />,
  to: '/finance',
  nav: [
    { label: 'Dashboard', icon: <IconGrid />, to: '/finance', exact: true },
    { label: 'My Contributions', icon: <IconWallet />, to: '/finance/my-contributions' },
    {
      label: 'Community Money',
      icon: <IconBanknote />,
      to: '/finance/money',
      permission: 'finance.contribution.view',
    },
    {
      label: 'Expenses & Income',
      icon: <IconSend />,
      to: '/finance/expenses-income',
      permission: 'finance.expense.view',
    },
    {
      label: 'Budgets & Shares',
      icon: <IconFlag />,
      to: '/finance/planning',
    },
    {
      label: 'Reports',
      icon: <IconBarChart />,
      to: '/finance/reports',
      permission: 'finance.report.view',
    },
  ],
};

/** Shown in the switcher as "coming soon" so the direction is visible. */
const PLANNED_APPS: readonly AppDefinition[] = [
  {
    id: 'meetings',
    name: 'Meetings',
    description: 'Assemblies, minutes and attendance',
    icon: <IconChat />,
    nav: [],
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Community events and activities',
    icon: <IconCalendar />,
    nav: [],
  },
  {
    id: 'voting',
    name: 'Voting',
    description: 'Resolutions and elections',
    icon: <IconCheckSquare />,
    nav: [],
  },
  {
    id: 'reports',
    name: 'Reports',
    description: 'Cross-app reporting',
    icon: <IconBarChart />,
    nav: [],
  },
];

export const APPS: readonly AppDefinition[] = [COMMUNITY_APP, FINANCE_APP, ...PLANNED_APPS];
