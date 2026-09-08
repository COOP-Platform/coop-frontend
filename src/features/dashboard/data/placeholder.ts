/**
 * PLACEHOLDER DASHBOARD DATA — NOT WIRED TO THE API.
 *
 * The backend has no summary endpoint: there is nothing that returns member
 * counts, monthly contribution totals, a contributions trend, an activity feed
 * or upcoming events. Building those means either one aggregate endpoint
 * (cheapest for the client — one request per dashboard load) or fanning out
 * across `communities`, `finance` and `meetings` and totalling here.
 *
 * Every value below is invented, matching the design's figures so the layout
 * can be reviewed. The components take all of it as props and hold no state,
 * so replacing this file with a query hook is a change to the route only.
 */

export interface StatDelta {
  /** Pre-formatted, e.g. "+4" or "+12.5%". Rendered verbatim. */
  label: string;
  direction: 'up' | 'down' | 'neutral';
}

export interface Stat {
  id: string;
  label: string;
  value: string;
  delta: StatDelta;
  /** Trailing text after the delta, e.g. "vs last month". */
  deltaSuffix: string;
}

export interface TrendPoint {
  /** Short month label for the axis. */
  label: string;
  /** Value in the chart's stated unit — millions of RWF here. */
  value: number;
}

export interface MemberAction {
  id: string;
  actor: string;
  /** The action, minus the actor's name — rendered after it. */
  action: string;
  /** Optional emphasised fragment at the end of the action, e.g. an amount. */
  highlight?: string;
  timeAgo: string;
  context: string;
}

export interface UpcomingEvent {
  id: string;
  month: string;
  day: string;
  title: string;
  time: string;
  location: string;
}

export const STATS: readonly Stat[] = [
  {
    id: 'members',
    label: 'Total Members',
    value: '156',
    delta: { label: '+4', direction: 'up' },
    deltaSuffix: 'vs last month',
  },
  {
    id: 'contributions',
    label: 'Monthly Contributions',
    value: '2,450,000 RWF',
    delta: { label: '+12.5%', direction: 'up' },
    deltaSuffix: 'vs last month',
  },
  {
    id: 'events',
    label: 'Upcoming Events',
    value: '3',
    delta: { label: 'On Track', direction: 'neutral' },
    deltaSuffix: 'vs last month',
  },
  {
    id: 'approvals',
    label: 'Pending Approvals',
    value: '8',
    delta: { label: '-3', direction: 'down' },
    deltaSuffix: 'vs last month',
  },
];

export const CONTRIBUTIONS_TREND: readonly TrendPoint[] = [
  { label: 'Nov', value: 1.35 },
  { label: 'Dec', value: 1.82 },
  { label: 'Jan', value: 2.36 },
  { label: 'Feb', value: 1.63 },
  { label: 'Mar', value: 2.08 },
  { label: 'Apr', value: 2.45 },
];

export const RECENT_ACTIONS: readonly MemberAction[] = [
  {
    id: 'a1',
    actor: 'Sarah Ganza',
    action: 'recorded a contribution of',
    highlight: '150,000 RWF',
    timeAgo: '10 minutes ago',
    context: 'Family Fund',
  },
  {
    id: 'a2',
    actor: 'Patrick Ishimwe',
    action: 'submitted a new event proposal: Summer Reunion 2024',
    timeAgo: '1 hour ago',
    context: 'Pending Review',
  },
  {
    id: 'a3',
    actor: 'Christian Shema',
    action: 'registered as a new member',
    timeAgo: 'Yesterday',
    context: 'Approved by Vice-President',
  },
];

export const UPCOMING_EVENTS: readonly UpcomingEvent[] = [
  {
    id: 'e1',
    month: 'May',
    day: '18',
    title: 'Quarterly Family Meeting',
    time: '14:00',
    location: 'Kigali / Zoom',
  },
  {
    id: 'e2',
    month: 'Jun',
    day: '22',
    title: 'Annual Cousins Gala',
    time: '18:00',
    location: 'Marriott Hotel',
  },
];
