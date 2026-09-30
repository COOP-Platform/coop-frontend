import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import {
  Button,
  IconAlertTriangle,
  IconBellAlert,
  IconMail,
  IconTile,
  IconUserOff,
  IconUsers,
} from '@/components/ui';
import type { DirectoryMember, Invitation } from '@/features/members';
import type { Position } from '@/features/positions';

/** Pending invitations inside this window of their expiry get flagged. */
const EXPIRY_WARNING_DAYS = 2;
const DAY = 24 * 60 * 60 * 1000;

interface NeedsAttentionProps {
  pendingInvitations: readonly Invitation[];
  vacantSeats: readonly Position[];
  membersWithoutPosition: readonly DirectoryMember[];
  canInvite: boolean;
  canAssign: boolean;
}

interface AttentionItem {
  id: string;
  icon: ReactNode;
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function NeedsAttention({
  pendingInvitations,
  vacantSeats,
  membersWithoutPosition,
  canInvite,
  canAssign,
}: NeedsAttentionProps) {
  const navigate = useNavigate();
  const toInvitations = () =>
    void navigate({ to: '/community/invitations', search: { status: 'pending' } });

  const unsent = pendingInvitations.filter((i) => i.invitation_email_sent_at === null);
  const expiring = pendingInvitations.filter(
    (i) => new Date(i.expires_at).getTime() - Date.now() < EXPIRY_WARNING_DAYS * DAY,
  );

  const items: AttentionItem[] = [];

  if (unsent.length > 0) {
    items.push({
      id: 'unsent',
      icon: <IconAlertTriangle />,
      title: `${plural(unsent.length, 'invitation email', 'invitation emails')} did not send`,
      detail: 'Resend so the invitee receives their link',
      action: canInvite ? { label: 'Review Invitations', onClick: toInvitations } : undefined,
    });
  }

  if (expiring.length > 0) {
    items.push({
      id: 'expiring',
      icon: <IconMail />,
      title: `${plural(expiring.length, 'invitation expires', 'invitations expire')} within ${EXPIRY_WARNING_DAYS} days`,
      detail: 'Recipients have not yet confirmed entry',
      action: canInvite ? { label: 'Review Invitations', onClick: toInvitations } : undefined,
    });
  }

  if (membersWithoutPosition.length > 0) {
    items.push({
      id: 'no-position',
      icon: <IconUsers />,
      title: `${plural(membersWithoutPosition.length, 'member has', 'members have')} no position`,
      detail: 'Without one they cannot open any community screen',
      action: canAssign
        ? {
            label: 'Assign Position',
            onClick: () => void navigate({ to: '/community/members', search: { role: 'none' } }),
          }
        : undefined,
    });
  }

  if (vacantSeats.length > 0) {
    items.push({
      id: 'vacant',
      icon: <IconUserOff />,
      title: `${plural(vacantSeats.length, 'position', 'positions')} unassigned`,
      detail: `${vacantSeats.map((p) => p.name).join(', ')} ${vacantSeats.length === 1 ? 'seat is' : 'seats are'} currently open`,
      action: canAssign
        ? { label: 'Assign Position', onClick: () => void navigate({ to: '/community/positions' }) }
        : undefined,
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="attention" aria-labelledby="attention-title">
      <h2 id="attention-title" className="attention__title">
        <span className="attention__title-icon" aria-hidden="true">
          <IconBellAlert />
        </span>
        Needs Attention
      </h2>
      <ul className="attention__list" role="list">
        {items.map((item) => (
          <li key={item.id} className="attention__item">
            <IconTile tone="warning" round>
              {item.icon}
            </IconTile>
            <div className="attention__body">
              <p className="attention__item-title">{item.title}</p>
              <p className="attention__item-detail">{item.detail}</p>
            </div>
            {item.action && (
              <Button variant="warning" size="sm" inline onClick={item.action.onClick}>
                {item.action.label}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
