import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import {
  Button,
  IconAlertTriangle,
  IconMail,
  IconPencil,
  IconTile,
  IconUserOff,
  IconUsers,
  SectionCard,
} from '@/components/ui';
import type { DirectoryMember, Invitation } from '@/features/members';
import { listInWords } from '@/features/communities/components/settings/profile';
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
  /**
   * Parts of the community profile still empty ("vision", "logo"), for
   * members who may edit it. The setup hub: finishing it is one click away.
   */
  incompleteProfile?: readonly string[];
  /** "Not needed" on the vacant seats — the community decided it has no committee. */
  onDismissVacant?: () => void;
}

interface AttentionItem {
  id: string;
  icon: ReactNode;
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
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
  incompleteProfile = [],
  onDismissVacant,
}: NeedsAttentionProps) {
  const navigate = useNavigate();
  const toInvitations = () =>
    void navigate({ to: '/community/invitations', search: { status: 'pending' } });

  const unsent = pendingInvitations.filter((i) => i.invitation_email_sent_at === null);
  const expiring = pendingInvitations.filter(
    (i) => new Date(i.expires_at).getTime() - Date.now() < EXPIRY_WARNING_DAYS * DAY,
  );

  const items: AttentionItem[] = [];

  if (incompleteProfile.length > 0) {
    items.push({
      id: 'profile',
      icon: <IconPencil />,
      title: 'Finish the community profile',
      detail: `Missing: ${listInWords(incompleteProfile)}`,
      action: {
        label: 'Complete Profile',
        onClick: () => void navigate({ to: '/community/settings', search: { edit: true } }),
      },
    });
  }

  if (unsent.length > 0) {
    items.push({
      id: 'unsent',
      icon: <IconAlertTriangle />,
      title: `${plural(unsent.length, 'invitation email', 'invitation emails')} did not send`,
      detail: 'Resend the link',
      action: canInvite ? { label: 'Review Invitations', onClick: toInvitations } : undefined,
    });
  }

  if (expiring.length > 0) {
    items.push({
      id: 'expiring',
      icon: <IconMail />,
      title: `${plural(expiring.length, 'invitation expires', 'invitations expire')} within ${EXPIRY_WARNING_DAYS} days`,
      detail: 'Not yet accepted',
      action: canInvite ? { label: 'Review Invitations', onClick: toInvitations } : undefined,
    });
  }

  if (membersWithoutPosition.length > 0) {
    items.push({
      id: 'no-position',
      icon: <IconUsers />,
      title: `${plural(membersWithoutPosition.length, 'member has', 'members have')} no position`,
      detail: 'They cannot open community screens',
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
      detail: vacantSeats.map((p) => p.name).join(', '),
      action: canAssign
        ? { label: 'Assign Position', onClick: () => void navigate({ to: '/community/positions' }) }
        : undefined,
      secondary: onDismissVacant ? { label: 'Not needed', onClick: onDismissVacant } : undefined,
    });
  }

  if (items.length === 0) return null;

  return (
    <SectionCard title="Needs attention" flush>
      <ul className="dash-list" role="list">
        {items.map((item) => (
          <li key={item.id} className="dash-list__item">
            <IconTile tone="warning" round size="sm">
              {item.icon}
            </IconTile>
            <div className="dash-list__body">
              <p className="dash-list__title">{item.title}</p>
              <p className="dash-list__sub">{item.detail}</p>
            </div>
            {(item.action || item.secondary) && (
              <div className="dash-list__actions">
                {item.secondary && (
                  <Button variant="secondary" size="sm" inline onClick={item.secondary.onClick}>
                    {item.secondary.label}
                  </Button>
                )}
                {item.action && (
                  <Button variant="warning" size="sm" inline onClick={item.action.onClick}>
                    {item.action.label}
                  </Button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
