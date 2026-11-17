/*
 * Who sees the full picture of an area, not just its final records. Ordinary
 * members see paid / approved / published things only; these roles see
 * pending, rejected and reversed ones, balances, attendance and responses.
 * The Auditor (audit.view) oversees everything, read-only. The backend
 * enforces the same rules (finance/visibility.py, meetings/visibility.py).
 */

type Can = (permission: string) => boolean;

const any = (can: Can, codes: readonly string[]) => codes.some((code) => can(code));

export const AUDIT = 'audit.view';

export const reviewsContributions = (can: Can) =>
  any(can, [
    'finance.contribution.confirm',
    'finance.contribution.reject',
    'finance.contribution.reverse',
    AUDIT,
  ]);

export const reviewsExpenses = (can: Can) =>
  any(can, ['finance.expense.approve', 'finance.expense.reverse', 'finance.expense.record', AUDIT]);

export const reviewsIncome = (can: Can) =>
  any(can, ['finance.income.approve', 'finance.income.reverse', 'finance.income.record', AUDIT]);

export const seesAccountBalances = (can: Can) =>
  any(can, ['finance.account.manage', 'finance.contribution.confirm', AUDIT]);

export const runsMeetings = (can: Can) =>
  any(can, [
    'meeting.attendance.record',
    'meeting.minutes.write',
    'meeting.minutes.publish',
    AUDIT,
  ]);

export const organisesEvents = (can: Can) => any(can, ['event.create', 'event.update', AUDIT]);
