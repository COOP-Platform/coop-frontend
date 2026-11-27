import { formatAmount } from './format';

export interface Share {
  /** What you are asked, required or voluntary; 0 when not asked; null for any amount. */
  asked_minor: number | null;
  paid_minor: number;
  pending_minor: number;
}

export type PartTone = 'todo' | 'done' | 'extra' | 'none';

/**
 * Your part of a budget in one plain sentence: what you were asked, what you
 * paid, what is left, or how much more than asked you gave.
 */
export function yourPart(
  share: Share,
  currency: string,
): { text: string; tone: PartTone; leftMinor: number } {
  const { asked_minor: asked, paid_minor: paid, pending_minor: pending } = share;
  const money = (minor: number) => `${formatAmount(minor)} ${currency}`;
  const waiting = pending > 0 ? ` · ${money(pending)} waiting for approval` : '';

  if (asked === null) {
    return paid > 0
      ? { text: `You paid ${money(paid)}. Thank you!${waiting}`, tone: 'done', leftMinor: 0 }
      : { text: `Give what you can.${waiting}`, tone: 'todo', leftMinor: 0 };
  }
  if (asked === 0) {
    return paid > 0
      ? {
          text: `You are not asked to pay, but you gave ${money(paid)}. Thank you!${waiting}`,
          tone: 'extra',
          leftMinor: 0,
        }
      : { text: 'You are not asked to pay.', tone: 'none', leftMinor: 0 };
  }
  if (paid < asked) {
    const left = asked - paid;
    return {
      text:
        paid > 0
          ? `You are asked ${money(asked)} · you paid ${money(paid)} · ${money(left)} left to pay${waiting}`
          : `You are asked ${money(asked)}${waiting}`,
      tone: 'todo',
      leftMinor: left,
    };
  }
  if (paid === asked) {
    return {
      text: `You paid your ${money(asked)}. Thank you!${waiting}`,
      tone: 'done',
      leftMinor: 0,
    };
  }
  return {
    text: `You paid ${money(paid)}: ${money(paid - asked)} more than asked. Thank you!${waiting}`,
    tone: 'extra',
    leftMinor: 0,
  };
}

/** A member's status for the Treasurer's list. */
export function memberStatus(
  asked: number | null,
  paid: number,
): { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' } {
  if (asked === null)
    return paid > 0 ? { label: 'Paid', tone: 'success' } : { label: 'Not paid', tone: 'neutral' };
  if (asked === 0)
    return paid > 0
      ? { label: `+${formatAmount(paid)} extra`, tone: 'info' }
      : { label: 'Not asked', tone: 'neutral' };
  if (paid === 0) return { label: 'Not paid', tone: 'warning' };
  if (paid < asked) return { label: `${formatAmount(asked - paid)} left`, tone: 'warning' };
  if (paid === asked) return { label: 'Paid', tone: 'success' };
  return { label: `+${formatAmount(paid - asked)} extra`, tone: 'info' };
}
