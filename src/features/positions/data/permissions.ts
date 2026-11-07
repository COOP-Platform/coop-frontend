/*
 * The platform permission catalogue, copied from the backend's
 * `rbac/catalog.py` (PERMISSIONS). There is no endpoint that lists it, so the
 * position editor needs its own copy to offer checkboxes. Keep in step with
 * the backend — an unknown code is rejected with a 400 there, so drift fails
 * loudly rather than silently. See docs/sprint-2-integration.md.
 */

export interface PermissionDefinition {
  code: string;
  module: string;
  description: string;
}

export const PERMISSION_CATALOG: readonly PermissionDefinition[] = [
  {
    code: 'dashboard.view',
    module: 'dashboard',
    description: 'See the community dashboard and its summary figures',
  },
  {
    code: 'community.view',
    module: 'community',
    description: 'View community profile and settings',
  },
  {
    code: 'community.update',
    module: 'community',
    description: 'Edit community profile, vision and mission',
  },
  {
    code: 'community.settings.manage',
    module: 'community',
    description: 'Change currency, language and contact details',
  },
  {
    code: 'community.archive',
    module: 'community',
    description: 'Archive or suspend the community',
  },
  {
    code: 'member.view',
    module: 'member',
    description: 'View the member directory and member profiles',
  },
  {
    code: 'member.invite',
    module: 'member',
    description: 'Invite new members and resend credential emails',
  },
  {
    code: 'member.update',
    module: 'member',
    description: 'Edit member records and category assignment',
  },
  { code: 'member.suspend', module: 'member', description: 'Suspend or reinstate a member' },
  { code: 'member.remove', module: 'member', description: 'Remove a member from the community' },
  {
    code: 'member.category.manage',
    module: 'member',
    description: 'Create and retire member categories',
  },
  {
    code: 'position.view',
    module: 'position',
    description: 'View positions and the permissions they hold',
  },
  {
    code: 'position.create',
    module: 'position',
    description: 'Create a position for this community',
  },
  {
    code: 'position.update',
    module: 'position',
    description: 'Edit a position name, description or permissions',
  },
  {
    code: 'position.delete',
    module: 'position',
    description: 'Delete a position the community added',
  },
  {
    code: 'position.assign',
    module: 'position',
    description: 'Grant or revoke positions for members',
  },
  {
    code: 'meeting.view',
    module: 'meeting',
    description: 'View meetings, agendas and published minutes',
  },
  {
    code: 'meeting.create',
    module: 'meeting',
    description: 'Schedule a meeting and set its agenda',
  },
  {
    code: 'meeting.update',
    module: 'meeting',
    description: 'Edit meeting details and agenda items',
  },
  { code: 'meeting.cancel', module: 'meeting', description: 'Cancel a scheduled meeting' },
  {
    code: 'meeting.attendance.record',
    module: 'meeting',
    description: 'Record attendance for a meeting',
  },
  {
    code: 'meeting.minutes.write',
    module: 'meeting',
    description: 'Write and edit draft minutes, decisions and action items',
  },
  {
    code: 'meeting.minutes.publish',
    module: 'meeting',
    description: 'Publish meeting minutes to members',
  },
  { code: 'event.view', module: 'event', description: 'View events the member is not hidden from' },
  { code: 'event.create', module: 'event', description: 'Create an event' },
  { code: 'event.update', module: 'event', description: 'Edit event details' },
  { code: 'event.cancel', module: 'event', description: 'Cancel an event' },
  {
    code: 'event.visibility.manage',
    module: 'event',
    description: 'Hide an event from chosen members, or show it again',
  },
  {
    code: 'event.rsvp',
    module: 'event',
    description: 'Answer an event invitation (confirm or send apologies)',
  },
  {
    code: 'announcement.view',
    module: 'announcement',
    description: 'Read published announcements',
  },
  { code: 'announcement.create', module: 'announcement', description: 'Draft a new announcement' },
  {
    code: 'announcement.update',
    module: 'announcement',
    description: 'Edit an existing announcement',
  },
  {
    code: 'announcement.publish',
    module: 'announcement',
    description: 'Publish or unpublish an announcement',
  },
  { code: 'announcement.delete', module: 'announcement', description: 'Delete an announcement' },
  {
    code: 'finance.contribution.view',
    module: 'finance',
    description: 'View contributions across the community',
  },
  {
    code: 'finance.contribution.record',
    module: 'finance',
    description: 'Record a contribution and upload proof',
  },
  {
    code: 'finance.contribution.confirm',
    module: 'finance',
    description: 'Confirm a recorded contribution',
  },
  {
    code: 'finance.contribution.reject',
    module: 'finance',
    description: 'Reject a recorded contribution with a reason',
  },
  {
    code: 'finance.contribution.reverse',
    module: 'finance',
    description: 'Reverse a confirmed contribution with a reason',
  },
  {
    code: 'finance.shares.manage',
    module: 'finance',
    description: "Set share prices and members' shares",
  },
  { code: 'finance.expense.view', module: 'finance', description: 'View community expenses' },
  { code: 'finance.expense.record', module: 'finance', description: 'Record an expense' },
  {
    code: 'finance.expense.approve',
    module: 'finance',
    description: 'Approve or reject an expense',
  },
  {
    code: 'finance.expense.reverse',
    module: 'finance',
    description: 'Reverse an approved expense with a reason',
  },
  {
    code: 'finance.income.view',
    module: 'finance',
    description: 'View income that is not a member contribution',
  },
  {
    code: 'finance.income.record',
    module: 'finance',
    description: 'Record income (donations, event revenue, interest)',
  },
  {
    code: 'finance.income.reverse',
    module: 'finance',
    description: 'Reverse recorded income with a reason',
  },
  {
    code: 'finance.cashflow.view',
    module: 'finance',
    description: 'View the cash flow and the wallet balance',
  },
  {
    code: 'finance.budget.view',
    module: 'finance',
    description: 'View budgets and their progress',
  },
  {
    code: 'finance.budget.manage',
    module: 'finance',
    description: 'Create, edit and close budgets',
  },
  {
    code: 'finance.campaign.view',
    module: 'finance',
    description: 'View dedicated contributions (campaigns)',
  },
  {
    code: 'finance.campaign.manage',
    module: 'finance',
    description: 'Open, edit and close dedicated contributions',
  },
  {
    code: 'finance.account.manage',
    module: 'finance',
    description: 'Keep bank and mobile money accounts and enter their balances',
  },
  {
    code: 'finance.report.view',
    module: 'finance',
    description: 'View financial summaries and reports',
  },
  { code: 'audit.view', module: 'audit', description: 'Read the audit log' },
];

export const PERMISSION_MODULES: readonly string[] = [
  ...new Set(PERMISSION_CATALOG.map((p) => p.module)),
];

/** What every suggested position starts from (backend `_MEMBER_BASELINE`). */
export const MEMBER_BASELINE: readonly string[] = [
  'dashboard.view',
  'community.view',
  'member.view',
  'meeting.view',
  'event.view',
  'event.rsvp',
  'announcement.view',
  'finance.contribution.view',
  'finance.contribution.record',
  'finance.expense.view',
  'finance.income.view',
  'finance.cashflow.view',
  'finance.budget.view',
  'finance.campaign.view',
  'finance.report.view',
];
